var port = process.env.PORT || 3000;

const cheerio = require('cheerio');
const request = require('request-promise');
const express = require('express');

var app = express();
var bodyParser = require('body-parser')
app.use(bodyParser.json())


function getPlan(date) {
    return request({
        method: 'POST',
        uri: 'https://www.stw.berlin/xhr/speiseplan-wochentag.html',
        form: {
            resources_id: 527,
            date
        }
    })
}

function getMeals(planHtml) {
    let meals = {};

    const $ = cheerio.load(planHtml);

    let html = $('.splGroupWrapper');
    $(html).each((i, elem) => {
        let mealGroup = $(elem).find('.splGroup').text();
        meals[mealGroup] = [];


        $(elem).find('.splMeal > .col-md-6 > span').each((i, meal) => {
            let mealName = $(meal).text()
            meals[mealGroup].push(mealName);
        });

    })

    return meals;
}

function generateOutputText(meals) {
    let outputText = ''

    let keys = Object.keys(meals);
    keys.forEach((key, index) => {
        let mealGroup = key;

        if (keys.length === 1) {
            outputText += 'In der Kategorie ' + mealGroup + ' gibt es: ';
        } else if (index == keys.length - 1) {
            outputText += 'und in der Kategorie ' + mealGroup + ' gibt es: ';
        } else if (index > 0) {
            outputText += ', in der Kategorie ' + mealGroup + ' gibt es: ';
        } else {
            outputText += 'In der Kategorie ' + mealGroup + ' gibt es: ';
        }

        let mealsArray = meals[key];
        mealsArray.forEach((meal, index) => {
            if (mealsArray.length === 1) {
                outputText += meal + ''
            } else if (index == mealsArray.length - 1) {
                outputText += ' und ' + meal + ''
            } else if (index > 0) {
                outputText += ', ' + meal
            } else {
                outputText += meal;
            }
        })
    })

    outputText = outputText.replace(new RegExp(' , ', 'g'), ', ');
    outputText = outputText.replace(new RegExp(' . ', 'g'), '. ');
    return outputText;
}

function generateResponse(outputText) {
    return {
        "version": "1.0",
        "response": {
            "outputSpeech": {
                "type": "SSML",
                "text": outputText,
                "ssml": "<speak>" + outputText + "</speak>"
            }
        }
    }
}

app.post('/', function (req, res) {
    let date = req.body.request.intent.slots['Day'].value;
    return getPlan(date)
        .then(getMeals)
        .then(generateOutputText)
        .then(outputText => {
            res.send(generateResponse(outputText));
        })
        .catch(function (err) {
            console.error(err);
            res.status(500).send(err)
        });
});

app.listen(port, function () {
    console.log('Example app listening on port 3000!');
});