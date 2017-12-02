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

function generateResponse(meals) {
    return {
        "version": "1.0",
        "response": {
            "outputSpeech": {
                "type": "PlainText",
                "text": Object.keys(meals).join(', '),
                "ssml": "<speak>" + Object.keys(meals).join(', ') + "</speak>"
            }
        }
    }

}

app.post('/', function (req, res) {
    let date = req.body.request.intent.slots['Day'].value;
    return getPlan(date)
        .then(getMeals)
        .then(meals => {
            res.send(generateResponse(meals));
        })
        .catch(function (err) {
            console.error(err);
            res.status(500).send(err)
        });
});

app.listen(port, function () {
    console.log('Example app listening on port 3000!');
});