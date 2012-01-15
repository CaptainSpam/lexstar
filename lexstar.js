"use strict";
/*
 * Lexstar 6000
 * By Nicholas Killewald, 2012
 */

// Define these ahead of time; we can't pass parameters into centerMap if it's
// being used as an event callback, like in window.onresize.

// Lexington will be at 2404px, 690px on the map.  Future versions of this may
// allow for other cities.  We'd need some way to convert lat/lon into pixel
// locations on this one specific map.
var defaultX = 2404;
var defaultY = 690;

var timer;

var xmlHttp;

var lastTimeStamp;

function initLexstar()
{
    // Perform an initial refresh.  This also sets the timer in motion.
    refreshAll();

    // If the window gets resized, we need to recenter the map.
    window.onresize = centerMap;
}

function refreshAll()
{
    clearTimeout(timer);
    reloadMap();
    reloadData();

    // Then, we refresh the whole thing every 15 minutes.
    timer = setTimeout(refreshAll, 900000);
}

function reloadMap()
{
    var mapelem = document.getElementById("mainmap");

    var mapelem = document.getElementById("mainmap");
    mapelem.style.backgroundImage = "url(\"NatLoop.gif?t=" + new Date().getTime() + "\")";
    centerMap();
}

function centerMap()
{
    var width = window.innerWidth;
    var height = window.innerHeight;
    var mapelem = document.getElementById("mainmap");
   
    // We always want to center sort of to the west of the given point.  That'll
    // allow us to see incoming storm fronts.
    var centerX = defaultX - Math.floor((4 * width) / 5);
    var centerY = defaultY - Math.floor(height / 2);

    mapelem.style.backgroundPosition = -centerX + "px " + -centerY + "px";
}

function setCity(name)
{
    var nameelem = document.getElementById("cityname");

    nameelem.innerHTML = name;
}

function setImage(url)
{
    var imageelem = document.getElementById("conditionimage");

    // Sometimes, we don't GET any icon.  Account for it!
    if(url === "??????" || url === "???")
    {
        imageelem.style.backgroundImage = "url(\"UnknownWeather.png\")";
    }
    else
    {
        imageelem.style.backgroundImage = "url(\"" + url + "\")";
    }
}

function setConditionText(text)
{
    var textelem = document.getElementById("conditiontext");

    textelem.innerHTML = text;
}

function setTemperature(f, c)
{
    var tempelem = document.getElementById("conditiontemperature");

    tempelem.innerHTML = f + "&deg; F<br />(" + c + "&deg; C)";
}

function setTime(timeString)
{
    var timeelem = document.getElementById("timeaccessed");

    timeelem.innerHTML = timeString;
}

function setWind(direction, speed, gust)
{
    var windelem = document.getElementById("conditionwindspeed");
    var gustelem = document.getElementById("conditionwindgust");

    // Wind is always shown.
    windelem.innerHTML = "Wind: " + abbreviateDirection(direction) + " at " + speed + " MPH";

    // Gusts are only shown if they exist.
    if(gust > speed)
    {
        gustelem.style.display = "block";
        gustelem.innerHTML = "(with gusts up to " + gust + " MPH)";
    }
    else
    {
        gustelem.style.display = "none";
    }
}

function setPressure(press)
{
    var presselem = document.getElementById("conditionpressure");

    presselem.innerHTML = "Pressure: " + press + " In. Hg";
}

function setDewpoint(dew)
{
    var dewelem = document.getElementById("conditiondewpoint");

    dewelem.innerHTML = "Dewpoint: " + dew + "&deg; F";
}

function setHumidity(perc)
{
    var humelem = document.getElementById("conditionhumidity");

    humelem.innerHTML = "Humidity: " + perc + "%";
}

function fixToTwoDigits(input)
{
    // This just fixes a one-digit input to something zero-padded.
    if(input < 10)
    {
        return "0" + input;
    }
    else
    {
        return input;
    }
}

function abbreviateDirection(dir)
{
    var dirL = dir.toLowerCase();

    // Abbreviate!  If we don't know this direction, don't abbreviate it.
    if(dirL === "north")
    {
        return "N"
    }
    if(dirL === "northeast")
    {
        return "NE"
    }
    if(dirL === "east")
    {
        return "E"
    }
    if(dirL === "southeast")
    {
        return "SE"
    }
    if(dirL === "south")
    {
        return "S"
    }
    if(dirL === "southwest")
    {
        return "SW"
    }
    if(dirL === "west")
    {
        return "W"
    }
    if(dirL === "northwest")
    {
        return "NW"
    }

    // If all else fails...
    return dir;
}

function reloadData()
{
    // Start a reload in progress.  Also, hide the current conditions and show
    // the status indicator.
    document.getElementById("conditions").style.display = "none";
    var statuselem = document.getElementById("statusarea");
    
    statuselem.style.display = "block";
    statuselem.innerHTML = "Loading data...";
    
    setTime("");

    // Now, fire off a connection!
    xmlHttp = new XMLHttpRequest();
    // This file is refreshed via cron job.  We can't open it from remote in
    // the context of JavaScript, for fairly good reason.
    xmlHttp.open("GET", "KLEX.xml?t=" + new Date().getTime(), true);
    xmlHttp.setRequestHeader("Access-Control-Allow-Origin","*");
    xmlHttp.onreadystatechange = conditionsStateChange;
    xmlHttp.send();
}

function conditionsStateChange()
{
    if(xmlHttp.readyState === 4 && xmlHttp.status === 200)
    {
        document.getElementById("conditions").style.display = "block";
        document.getElementById("statusarea").style.display = "none";

        // Let's get some data!
        var docElement = xmlHttp.responseXML.documentElement;
        
        // First, the location name.  This is probably going to be Blue Grass
        // Airport.  If it isn't, that would be interesting indeed.
        setCity(getSimpleElementText(docElement, "location"));

        // Now, the image and the local conditions.
        if(docElement.getElementsByTagName("icon_url_name")[0] == undefined)
        {
            setImage("???");
        }
        else
        {
            setImage(getSimpleElementText(docElement, "icon_url_base") + getSimpleElementText(docElement, "icon_url_name"));
        }
        setConditionText(getSimpleElementText(docElement, "weather"));
        setTemperature(getSimpleElementText(docElement, "temp_f"), getSimpleElementText(docElement, "temp_c"));

        // The wind should be broken apart a bit.
        setWind(getSimpleElementText(docElement, "wind_dir"), getSimpleElementText(docElement, "wind_mph"), getSimpleElementText(docElement, "wind_gust_mph"));

        // We'll use inches of mercury as pressure.
        setPressure(getSimpleElementText(docElement, "pressure_in"));

        // Dew!
        setDewpoint(getSimpleElementText(docElement, "dewpoint_f"));

        // Humidity!
        setHumidity(getSimpleElementText(docElement, "relative_humidity"));

        // More data!  MOAR!
        setTime(getSimpleElementText(docElement, "observation_time"));
    }

}

function getSimpleElementText(docElement, name)
{
    var elem = docElement.getElementsByTagName(name)[0];

    if(elem == undefined)
    {
        return "???";
    }
    else
    {
        return docElement.getElementsByTagName(name)[0].firstChild.nodeValue;
    }
}
