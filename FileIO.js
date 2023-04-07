const fs = require('fs');
module.exports = {
    saveToFile(json) {
        jsonObj = {}
        jsonObj.access_token = json.access_token
        jsonObj.refresh_token = json.refresh_token
        fs.writeFile('Alejandro.json', JSON.stringify(jsonObj), 'utf8', function () { console.log("File salvato"); });
    },
    editFile(json){
        var jsonObj = JSON.parse(fs.readFileSync('Alejandro.json', 'utf8'));

        if (!jsonObj)
            jsonObj = {};

        if (Object.hasOwn(json, 'access_token'))
            jsonObj.access_token = json.access_token;
        if (Object.hasOwn(json, 'refresh_token'))
            jsonObj.refresh_token = json.refresh_token;
        fs.writeFile('Alejandro.json', JSON.stringify(jsonObj), 'utf8', function () { console.log("File salvato"); });
    }
}