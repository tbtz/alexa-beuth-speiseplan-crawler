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

function formatDate(date) {
    date = new Date(date);
    let dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    let dayName = dayNames[date.getDay()];

    let day = date.getDate();
    if (day < 10) day = '0' + day;
    let month = date.getMonth() + 1;
    if (month < 10) month = '0' + month;
    let year = date.getFullYear().toString().substr(-2);

    return `${dayName}, den <say-as interpret-as="date">${day}.${month}.${year}</say-as>`;
}

function generateOutputText(meals, date) {
    console.log(date);
    let dateString = formatDate(date);
    let outputText = 'Hier ist der Essensplan für ' + dateString + '. '

    for (var key in meals) {
        let mealGroup = key;
        outputText += 'In der Kategorie ' + mealGroup + ' gibt es: ';
        mealsArray = meals[key];

        mealsArray.forEach((meal, index) => {
            if (mealsArray.length === 1) {
                outputText += meal + '. '
            } else if (index == mealsArray.length - 1) {
                outputText += ' und ' + meal + '. '
            } else if (index > 0) {
                outputText += ', ' + meal
            } else {
                outputText += meal;
            }
        })
    }

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
        .then(meals => {
            return generateOutputText(meals, date)
        })
        .then(outputText => {
            res.send(generateResponse(outputText));
        })
        .catch(function (err) {
            res.status(500).send(err)
        });
});

app.listen(port, function () {
    console.log('Example app listening on port 3000!');
});