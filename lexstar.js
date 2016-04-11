/*
 * Lexstar 7000 (forecast version)
 * https://github.com/CaptainSpam/lexstar
 * By Nicholas Killewald, 2016
 */

// Define these ahead of time; we can't pass parameters into centerMap if it's
// being used as an event callback, like in window.onresize.

// Lexington will be at 2404px, 690px on the map.  Future versions of this may
// allow for other cities.  We'd need some way to convert lat/lon into pixel
// locations on this one specific map.
var defaultX = 2404;
var defaultY = 690;

var mapWidth = 3400;
var mapHeight = 1600;

var timer;

var curData;
var forecastData;
var forecastDataParsed;

var isCelsius = 0;
var isForecast = 0;

var DAY_OF_WEEK = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
];

// The scores of each weather condition.  The conditions are all the possible
// things that the NOAA can report in XML, as per the XSD.  The scores I just
// made up.
var CONDITION_SCORES = {
    // First, the special cases.  These seem really bad.
    "volcanic ash":100,
    "water spouts":99,
    "blowing sand":98,
    // Then, slightly more odd reports.  If these appear in a FORECAST, not
    // CURRENT CONDITIONS, I'd imagine we might want to know about this.
    "blowing dust":97,
    "smoke":96,
    // Thunderstorms are always somewhat high up.
    "thunderstorms":95,
    // Ice and freezing rain are generally major concerns.  That includes hail.
    "hail":94,
    "ice pellets":93,
    "ice crystals":92,
    "freezing rain":91,
    "freezing drizzle":90,
    "freezing spray":89,
    "ice fog":88,
    "freezing fog":87,
    // Next comes snow, because I know how everybody suddenly forgets how to
    // drive as soon as the first flurries come down.
    "snow":86,
    "snow showers":85,
    "blowing snow":84,
    "frost":83,
    // Now toss in the rain.
    "rain":82,
    "rain showers":81,
    "drizzle":80,
    // And finish up with vision-obscuring stuff.
    "fog":79,
    "haze":78
};

// The scores of the intensity ratings.  These are straightforward.
var INTENSITY_SCORES = {
    "heavy":100,
    "moderate":80,
    "light":60,
    "very light":40,
    "none":0
};

// The scores of the coverage ratings.  These are weird and sort of difficult
// to categorize, since it's hard to tell if "patchy" is worse than "periods
// of", but that's not going to stop me from making it up as I go along anyway.
var COVERAGE_SCORES = {
    // I like words like "definitely".  Just seems so... definite.
    "definitely":100,
    // I guess these are the next-highest?
    "frequent":99,
    "widespread":98,
    "numerous":97,
    // Now, coverages that define a region, rather than a likelihood.
    "areas":96,
    "scattered":95,
    "patchy":94,
    "isolated":93,
    // Then... frequency?
    "occasional":92,
    "periods of":91,
    "intermittent":90,
    // And now chance.
    "likely":89,
    "chance":88,
    "slight chance":87,
    "none":0
};

$(document).ready(initLexstar);

function initLexstar()
{
    // Perform an initial refresh.  This also sets the timer in motion.
    refreshAll();

    // refreshAll doesn't cover the Celsius toggle.
    $("#celsiustoggle").html("&deg;C");

    // Nor the forecast button.
    $("#forecasttoggle").html("4-Day Forecast");

    // If the window gets resized, we need to recenter the map.
    $(window).resize(function() { centerMap(defaultX, defaultY); });
    centerMap(defaultX, defaultY);

    // Click!
    $("#celsiustoggle").click(toggleCelsius);
    $("#forecasttoggle").click(toggleForecast);
    $("#centerbutton").click(centerPressed);
    $("#postopleft").click(function() { locationButton("topleft"); });
    $("#postopright").click(function() { locationButton("topright"); });
    $("#posbottomleft").click(function() { locationButton("bottomleft"); });
    $("#posbottomright").click(function() { locationButton("bottomright"); });
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
    $("#mainmap").css("background-image", "url(\"NatLoop.gif?t=" + new Date().getTime() + "\")");
}

function centerMap(x,y)
{
    var width = $(window).width();
    var height = $(window).height();
   
    // We always want to center sort of to the west of the given point.  That'll
    // allow us to see incoming storm fronts.
    var centerX = x - Math.floor((4 * width) / 5);
    var centerY = y - Math.floor(height / 2);

    // Make sure we keep the image filling the entire window.  If, for instance,
    // we want to center on San Jose, we want the left edge of the map to be
    // the ultimate left side of the display, regardless of how little of the
    // incoming weather we'd see.
    if(centerX < 0)
    {
        centerX = 0;
    }

    if(centerY < 0)
    {
        centerY = 0;
    }

    if((mapWidth - width) < centerX)
    {
        centerX = mapWidth - width;
    }

    if((mapHeight - height) < centerY)
    {
        centerY = mapHeight - height;
    }

    $("#mainmap").css("left", -centerX + "px").css("top", -centerY + "px");

    // Since this is called as a result of resizing the window, make sure the
    // draggable limits are also updated.
    $("#mainmap").draggable({
        containment: [-(mapWidth - width), -(mapHeight - height), 0, 0],
        start: startMapDrag,
        stop: stopMapDrag
        });
}

function setCity(name)
{
    $("#cityname").html(name);
}

function setImage(url)
{
    // Sometimes, we don't GET any icon.  Account for it!
    if(url === "??????" || url === "???")
    {
        $("#conditionimage").css("background-image", "url(\"weathericons/UnknownWeather.png\")");
    }
    else
    {
        $("#conditionimage").css("background-image", "url(\"weathericons/" + url + "\")");
    }
}

function setConditionText(text)
{
    $("#conditiontext").html(text);
}

function setTemperature(temp, isCelsius)
{
    $("#conditiontemperature").html(temp + "&deg; " + (isCelsius ? "C" : "F"));
}

function setTime(timeString)
{
    $("#timeaccessed").html(timeString);
}

function setCredit(name, link)
{
    if(name != undefined && name != "")
    {
        $("#creditlink").html("Data courtesy <a href=\"" + link + "\">" + name + "</a>");
    }
    else
    {
        $("#creditlink").html("");
    }

}

function setWind(direction, speed, gust, isCelsius)
{
    // Make sure these are numbers.  The numeric comparison sort of fails in
    // some cases otherwise.
    speed = Number(speed).valueOf();
    gust = Number(gust).valueOf();

    // If the wind is just plain dead, report it as "Calm".
    if(speed == 0)
    {
        $("#conditionwindspeed").html("Wind: Calm");
    }
    else
    {
        // If this is Celsius, also assume metric.  Convert!
        if(isCelsius)
        {
            speed = speed * 1.609344;
            gust = gust * 1.609344;

            var num1 = new Number(speed);
            var num2 = new Number(gust);

            speed = num1.toFixed(1);
            gust = num2.toFixed(1);
        }

        // If either of speed or gust are NaN, assume they're zero.
        if(isNaN(speed))
        {
            speed = 0;
        }

        if(isNaN(gust))
        {
            gust = 0;
        }

        // Wind is always shown.
        $("#conditionwindspeed").html("Wind: " + abbreviateDirection(direction) + " at " + speed + (isCelsius ? " KPH" : " MPH"));

        // Gusts are only shown if they exist.
        if(gust > speed)
        {
            $("#conditionwindgust").css("display", "block").html("(with gusts up to " + gust + (isCelsius ? " KPH" : " MPH") + ")");
        }
        else
        {
            $("#conditionwindgust").css("display", "none");
        }
    }
}

function setPressure(press, isCelsius)
{
    $("#conditionpressure").html("Pressure: " + press + (isCelsius ? " mb" : " In. Hg"));
}

function setDewpoint(dew, isCelsius)
{
    $("#conditiondewpoint").html("Dewpoint: " + dew + "&deg; " + (isCelsius ? "C" : "F"));
}

function setHumidity(perc)
{
    $("#conditionhumidity").html("Humidity: " + perc + "%");
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
    $("#mainblock").hide();
    $("#statusarea").show().html("Loading data...");
    
    setTime("");
    setCredit("", "");

    // Now, fire off a connection!  Screw you, JSLint, I'll break up my long
    // lines any way I damn well please!
    $.ajax({
        url: "KLEX.xml?t=" + new Date().getTime(),
        success: weatherDataSuccess,
        dataType: "xml"
    });

    $.ajax({
        url: "forecast.xml?t=" + new Date().getTime(),
        success: forecastDataSuccess,
        dataType: "xml"
    });
}

function displayF()
{
    // Now, the image and the local conditions.
    setImage(getSimpleElementText(curData, "icon_url_name", "???"));
    setConditionText(getSimpleElementText(curData, "weather", "Unknown Conditions"));
    setTemperature(getSimpleElementText(curData, "temp_f", "???"), false);

    // The wind should be broken apart a bit.
    setWind(getSimpleElementText(curData, "wind_dir", "???"), getSimpleElementText(curData, "wind_mph", "???"), getSimpleElementText(curData, "wind_gust_mph", "???"), false);

    // We'll use inches of mercury as pressure.
    setPressure(getSimpleElementText(curData, "pressure_in", "???"), false);

    // Dew!
    setDewpoint(getSimpleElementText(curData, "dewpoint_f", "???"), false);

    // Humidity!
    setHumidity(getSimpleElementText(curData, "relative_humidity", "???"));

    // More data!  MOAR!
    setTime(getSimpleElementText(curData, "observation_time", "unknown time"));
}

function displayC()
{
    // Now, the image and the local conditions.
    setImage(getSimpleElementText(curData, "icon_url_name", "???"));
    setConditionText(getSimpleElementText(curData, "weather", "Unknown Conditions"));
    setTemperature(getSimpleElementText(curData, "temp_c", "???"), true);

    // The wind should be broken apart a bit.
    setWind(getSimpleElementText(curData, "wind_dir", "???"), getSimpleElementText(curData, "wind_mph", "???"), getSimpleElementText(curData, "wind_gust_mph", "???"), true);

    // We'll use millibars for pressure.
    setPressure(getSimpleElementText(curData, "pressure_mb", "???"), true);

    // Dew!
    setDewpoint(getSimpleElementText(curData, "dewpoint_c", "???"), true);

    // Humidity!
    setHumidity(getSimpleElementText(curData, "relative_humidity", "???"));

    // More data!  MOAR!
    setTime(getSimpleElementText(curData, "observation_time", "unknown time"));
}

function weatherDataSuccess(data)
{
    $("#mainblock").show();
    $("#statusarea").hide();

    // Let's get some data!
    curData = data.documentElement;

    // First, the location name.  This is probably going to be Blue Grass
    // Airport.  If it isn't, that would be interesting indeed.
    setCity(getSimpleElementText(curData, "location", "Unknown Location"));

    // Credit!  It's due!  And it's due here!
    setCredit("NOAA", getSimpleElementText(curData, "credit_URL", "http://weather.gov"));

    // Now, the real data!  Which we'll hand off to other methods based on what
    // mode we're in.
    if(isCelsius)
    {
        displayC();
    }
    else
    {
        displayF();
    }
}

function forecastDataSuccess(data)
{
    // Forecast data takes some extra parsing, since we can't tell NOAA to only
    // give us four entries' worth of weather conditions/icons.  It'll give us
    // as many entries as it has for the date ranges we specify (since we're
    // using at-a-glance, that range will always be from today to about six
    // days ahead), and that means each day will have around four to eight or so
    // data points.  We'll need to pick the best ones for our purposes.
    forecastData = $(data.documentElement);
    forecastDataParsed = [];

    var today = new Date();

    // First off, the daily highs and lows.  Fortunately, those are listed in a
    // way that JS's Date object understands.  Unfortunately, the XML we get
    // back is 100% pure unfiltered government-agency-crafted XML.  We've got
    // some futzing about to do...
    var highs = [];
    var lows = [];
    var elements = [];

    // We have lists of highs and lows, but to match them up with dates, we need
    // the time-layout attribute.
    var layout = forecastData.find("temperature[type=minimum]").attr("time-layout");
    var temps = forecastData.find("temperature[type=minimum] value");
    var dates = forecastData.find("time-layout layout-key:contains('" + layout + "')").parent().find("start-valid-time");

    // Nah, let's not use a JQuery .each() call this time.
    for(var i = 0; i < dates.length; i++)
    {
        // As far as the forecast is concerned, we want to start with TOMORROW,
        // not today.  Today is already covered in current conditions.
        var date = new Date(dates.eq(i).text());
        if(thisIsTodayOrBefore(date, today))
        {
            continue;
        }

        var obj = {};
        obj["temp"] = temps.eq(i).text();
        obj["date"] = date;

        lows.push(obj);
    }

    // Repeat for highs.  Remember, we might not have the same number of highs
    // as lows, as the NOAA apparently considers each request wholly independent
    // of the others, meaning "get highs" and "get lows" don't have to line up.
    layout = forecastData.find("temperature[type=maximum]").attr("time-layout");
    temps = forecastData.find("temperature[type=maximum] value");
    dates = forecastData.find("time-layout layout-key:contains('" + layout + "')").parent().find("start-valid-time");

    for(var i = 0; i < dates.length; i++)
    {
        var date = new Date(dates.eq(i).text());
        if(thisIsTodayOrBefore(date, today))
        {
            continue;
        }

        var obj = {};
        obj["temp"] = temps.eq(i).text();
        obj["date"] = date;

        highs.push(obj);
    }

    // Okay... in theory, NOW the elements of highs and lows line up (insofar as
    // the elements exist).  Combine them together.  Limit it to four.
    for(var i = 0; i < lows.length && i < 4; i++)
    {
        var highF = Number(highs[i].temp);
        var lowF = Number(lows[i].temp);
        var highC = Math.round((highF - 32) / 1.8);
        var lowC = Math.round((lowF - 32) / 1.8);

        elements.push({
            "date":lows[i].date,
            "highF":highF,
            "lowF":lowF,
            "highC":highC,
            "lowC":lowC});
    }

    // Cloud coverage isn't a "condition", apparently.  It's a percentage that
    // operates entirely outside the condition reports.  Worse, it comes in as
    // an arbitrarily long series of forecasts for a given day.  So, to get at
    // least a decent cloudiness report, we'll average everything we get per
    // day and go with that.  Again, no JQuery .each() call, because this crazy
    // government-issue XML schema means I need to keep jumping back and forth
    // between elements.
    layout = forecastData.find("cloud-amount").attr("time-layout");
    var clouds = forecastData.find("cloud-amount value");
    dates = forecastData.find("time-layout layout-key:contains('" + layout + "')").parent().find("start-valid-time");

    var cumulativeCumulonimbus = 0;
    var count = 0;
    var lastSeenDate;
    for(var i = 0; i < clouds.length; i++)
    {
        // Since we're only dealing with up to four sequential dates at a time,
        // we can get away with just worrying about the date here.
        var curDate = new Date(dates.eq(i).text()).getDate();
        if(lastSeenDate != curDate)
        {
            if(lastSeenDate != undefined)
            {
                // If lastSeenDate wasn't undefined, we take the average and
                // toss it in to its respective entry, if we can find it.  This
                // can no doubt be made more efficient.
                for(var j = 0; j < elements.length; j++)
                {
                    if(elements[j]["date"].getDate() == curDate)
                    {
                        elements[j]["cloudiness"] = cumulativeCumulonimbus / count;
                        break;
                    }
                }
            }

            // Reset the variables and get ready for a new set.
            lastSeenDate = curDate;
            cumulativeCumulonimbus = 0;
            count = 0;
        }

        // Add another count, and add the coverage to the cumulative amount.
        count++;
        cumulativeCumulonimbus += Number(clouds.eq(i).text());
    }

    // That was the easy part.  Now to figure out what we're doing with the
    // conditions.  Unfortunately, these come in very, very arbitrarily, it
    // seems.  There can be any number of entries for a single date, depending
    // on what the NOAA thinks will be the conditions for that time of each day.
    // Worse, these dates/times are NOT guaranteed to be the same as the cloud
    // coverage dates, so we have to manually do the whole parsing part again.
    layout = forecastData.find("weather").attr("time-layout");
    var conditions = forecastData.find("weather weather-conditions");
    dates = forecastData.find("time-layout layout-key:contains('" + layout + "')").parent().find("start-valid-time");

    lastSeenDate = undefined;
    var curConditions = undefined;
    for(var i = 0; i < conditions.length; i++)
    {
        var curDate = new Date(dates.eq(i).text()).getDate();
        if(lastSeenDate != curDate)
        {
            if(lastSeenDate != undefined)
            {
                // New day!
                for(var j = 0; j < elements.length; j++)
                {
                    if(elements[j]["date"].getDate() == curDate)
                    {
                        var result = prioritizeWeatherConditions(curConditions, elements[j]["cloudiness"]);
                        elements[j]["conditions"] = result["conditions"];
                        elements[j]["conditionString"] = result["conditionString"];
                        elements[j]["icon"] = pickIcon(elements[j]["conditions"]);
                        break;
                    }
                }
            }

            // Reset!
            lastSeenDate = curDate;
            curConditions = $();
        }

        // Each entry consists of some number of values with attributes.  That
        // number may be zero.  Whatever the case, we toss them all into that
        // curConditions blob until we're on a different day.
        curConditions = curConditions.add(conditions.eq(i).find("value"));
    }

    // Good!  We now have everything parsed and ready.
    forecastDataParsed = elements;

    // Display the data.
    redrawForecast();
}

function redrawForecast()
{
    // TODO: Later on I'll look into converting the current conditions to
    // something like this, rather than a bunch of separate functions which
    // made more structural sense when it was the only data going on.

    // All forecasts go in the forecast container.  Obviously.
    var container = $("#forecast");

    // Poof!
    container.empty();

    // We've got parsed data from somewhere, I hope.
    for(var i = 0; i < forecastDataParsed.length; i++)
    {
        var element = forecastDataParsed[i];

        // Right, generate a forecast block.
        var block = generateEmptyForecast();

        // Put the day on top.  It's an abbreviated day, of course.
        block.find(".forecastday").text(DAY_OF_WEEK[element["date"].getDay()]);

        // The image is found in the usual place.
        block.find(".conditionimage").css("background-image", "url(\"weathericons/" + element["icon"] + "\")");

        // We've got a string set up for the conditions.
        block.find(".forecaststring").text(element["conditionString"]);

        // Temperature, though, we need to determine if we're talking about C or
        // F.  No, we're not talking about K or R.
        var temps;
        if(isCelsius)
        {
            temps = element["lowC"] + "&deg;C&ndash;" + element["highC"] + "&deg;C";
        }
        else
        {
            temps = element["lowF"] + "&deg;F&ndash;" + element["highF"] + "&deg;F";
        }

        block.find(".forecasttemperature").html(temps);

        // Then, put it in and we're good to go!
        container.append(block);
    }
}

function generateEmptyForecast()
{
    // All we do is just make a block.  Data comes elsewhere.
    var toReturn = $("<div class='forecastblock'></div>");

    toReturn.append("<div class='conditiondata conditionblock forecastday'></div>");
    toReturn.append("<div class='conditionimage'></div>");
    toReturn.append("<div class='conditiondata conditionblock forecasttemperature'></div>");
    toReturn.append("<div class='conditiondata conditionblock forecaststring'></div>");

    return toReturn;
}

function prioritizeWeatherConditions(conditions, cloudiness)
{
    // The conditions may be empty.  If so, we just report on how cloudy it is.
    if(conditions.length == 0)
    {
        var toReturn = getCloudiness(cloudiness);
        return {"conditionString":toReturn, "conditions":toReturn};
    }
    else
    {
        var intensity;
        var coverage;
        var condition;

        // We just want a quick summary.  As few words as possible (unlike this
        // comment block).  To that end, we're ignoring any "and" or "or" clause
        // in the actual data and just picking the WORST conditions for the day.
        // My idea of prioritizing them may not agree with reality, but I don't
        // live in an area where "volcanic ash" is a commonly-reported weather
        // condition, for instance, so I'm just assuming that if it shows up,
        // that's really really bad and worth being alerted about.
        conditions.each(function() {
            var me = $(this);

            // First, are the conditions worse?
            var newCondition = evaluateConditions(condition, me.attr("weather-type"));
            var newIntensity = evaluateIntensity(intensity, me.attr("intensity"));
            var newCoverage = evaluateCoverage(coverage, me.attr("coverage"));

            if(condition == undefined || newCondition != condition)
            {
                // Aha!  It got worse!  Condition, intensity, and coverage all
                // get reset.
                condition = newCondition;
                intensity = me.attr("intensity");
                coverage = me.attr("coverage");
            }
            else
            {
                // Otherwise, intensity and/or coverage may have changed.
                intensity = newIntensity;
                coverage = newCoverage;
            }

        });

        // Okay, now assemble all of this into a single, coherent string.
        // Unfortunately, the condition/intensity/coverage strings we get don't
        // always fit together in a grammatical sense...
        var toReturn = condition;

        // As a special case, "thunderstorms" gets shortened to "T-Storms".
        // "Thunderstorms" is a long word to stuff in that space, it turns out.
        if(condition == "thunderstorms") toReturn = "T-Storms"

        if(intensity != "none")
        {
            // Intensity comes before the condition ("very light rain", "heavy
            // thunderstorm", etc).
            toReturn = intensity + " " + toReturn;
        }

        // Coverage depends on what it is.
        if(coverage == "slight chance"
                || coverage == "chance"
                || coverage == "areas")
        {
            // These prefix the string, with "of" ("slight chance of rain",
            // "areas of fog", etc).
            toReturn = coverage + " of " + toReturn;
        }

        if(coverage == "periods of"
                || coverage == "occasional"
                || coverage == "isolated"
                || coverage == "scattered"
                || coverage == "patchy"
                || coverage == "widespread"
                || coverage == "frequent"
                || coverage == "intermittent")
        {
            // These also prefix the string, but with no "of", other than
            // "periods of", which already has it ("occasional snow showers",
            // "patchy rain", etc).
            // TODO: I'm including a few in here that sound like they need to
            // change depending on if the condition is plural or not ("frequent
            // thunderstorms", etc).  I might want to revisit that in the
            // future.
            toReturn = coverage + " " + toReturn;
        }

        if(coverage == "likely")
        {
            // "Likely" is a suffix ("snow showers likely", "freezing rain
            // likely", etc).
            toReturn = toReturn + " " + coverage;
        }

        // Other coverages are ignored ("definitely", "numerous", or a blank).
        // Capitalization will happen in CSS, for convenience.
        return {"conditionString":toReturn, "conditions":condition};
    }
}

function evaluateConditions(oldCondition, newCondition)
{
    if(oldCondition == undefined) return newCondition;

    // To the map!
    var oldScore = CONDITION_SCORES[oldCondition];
    var newScore = CONDITION_SCORES[newCondition];

    if(oldScore == undefined) return newCondition;
    if(newScore == undefined) return oldCondition;

    return (newScore > oldScore ? newCondition : oldCondition);
}

function evaluateIntensity(oldIntensity, newIntensity)
{
    if(oldIntensity == undefined) return newIntensity;

    var oldScore = INTENSITY_SCORES[oldIntensity];
    var newScore = INTENSITY_SCORES[newIntensity];

    if(oldScore == undefined) return newIntensity;
    if(newScore == undefined) return oldIntensity;

    return (newScore > oldScore ? newIntensity : oldIntensity);
}

function evaluateCoverage(oldCoverage, newCoverage)
{
    if(oldCoverage == undefined) return newCoverage;

    var oldScore = INTENSITY_SCORES[oldCoverage];
    var newScore = INTENSITY_SCORES[newCoverage];

    if(oldScore == undefined) return newCoverage;
    if(newScore == undefined) return oldCoverage;

    return (newScore > oldScore ? newCoverage : oldCoverage);
}

function pickIcon(conditions)
{
    // We'll just match the conditions up with existing icons.  I know the NOAA
    // gives us icons for this sort of thing, but those are a different set than
    // what they use for current conditions, and I'm not in the mood to make a
    // brand new bunch of icons for X% chance of something.
    switch(conditions)
    {
        case "fair": return "skc.png";
        case "slightly cloudy": return "few.png";
        case "cloudy": return "sct.png";
        case "really cloudy": return "bkn.png";
        case "overcast": return "ovc.png";
        case "thunderstorms": return "tsra.png";
        case "drizzle":
        case "rain showers": return "ra1.png";
        case "rain": return "ra.png";
        case "hail":
        case "ice pellets":
        case "ice crystals": return "ip.png";
        case "fog":
        case "freezing fog": 
        case "ice fog": return "fg.png";
        case "smoke":
        case "volcanic ash": 
        case "blowing dust": 
        case "blowing sand": return "smoke.png";
        case "haze": return "haze.png";
        case "water spouts": return "nsvrtsra.png";
        case "freezing rain":
        case "freezing drizzle":
        case "freezing spray": return "fzrara.png";
        case "blowing snow":
        case "snow showers":
        case "snow":
        case "frost": return "sn.png";
        default: return "UnknownWeather.png";
    }
}

function getCloudiness(cloudiness)
{
    // Look, I'm no meteorologist.  I'm not even a weather reporter.  So these
    // terms and ranges?  I'm making them up.
    if(cloudiness < 15)
        return "fair";
    else if(cloudiness < 35)
        return "slightly cloudy";
    else if(cloudiness < 55)
        return "cloudy";
    else if(cloudiness < 75)
        return "really cloudy";
    else
        return "overcast";
}

function thisIsTodayOrBefore(date, today)
{
    if(today == undefined) today = new Date();

    return date.getTime() < today.getTime()
            || (date.getDate() == today.getDate()
                && date.getMonth() == today.getMonth()
                && date.getFullYear() == today.getFullYear());
}

/**
 * Gets the first child's node value from the given element, or the fallback
 * parameter if that node is undefined.
 */
function getSimpleElementText(docElement, name, fallback)
{
    var elem = docElement.getElementsByTagName(name)[0];

    if(elem == undefined)
    {
        return fallback;
    }
    else
    {
        return docElement.getElementsByTagName(name)[0].firstChild.nodeValue;
    }
}

function locationButton(clicked)
{
    var boxelem = $("#infocontainer");
    // MOVE!
    switch(clicked)
    {
        case 'topleft':
            boxelem.css("left", "16px").css("right", "auto").css("top", "16px").css("bottom", "auto");
            break;
        case 'topright':
            boxelem.css("left", "auto").css("right", "16px").css("top", "16px").css("bottom", "auto");
            break;
        case 'bottomleft':
            boxelem.css("left", "16px").css("right", "auto").css("top", "auto").css("bottom", "16px");
            break;
        case 'bottomright':
            boxelem.css("left", "auto").css("right", "16px").css("top", "auto").css("bottom", "16px");
            break;
    }
}

function toggleCelsius()
{
    // Toggle the value...
    isCelsius = !isCelsius;

    // ... then re-render.
    redrawForecast();

    if(isCelsius)
    {
        displayC();
        $("#celsiustoggle").html("&deg;F");
    }
    else
    {
        displayF();
        $("#celsiustoggle").html("&deg;C");
    }
}

function toggleForecast()
{
    // Switch panels!
    isForecast = !isForecast;

    if(isForecast)
    {
        $("#conditions").hide();
        $("#forecast").show();
        $("#forecasttoggle").html("Current Conditions");
    }
    else
    {
        $("#conditions").show();
        $("#forecast").hide();
        $("#forecasttoggle").html("4-Day Forecast");
    }
}

function centerPressed()
{
    centerMap(defaultX, defaultY);
}

function startMapDrag()
{
    $("#infocontainer").css("opacity", "0.25");
    $("#locationtext").css("opacity", "0.25");
}

function stopMapDrag()
{
    $("#infocontainer").css("opacity", "1.0");
    $("#locationtext").css("opacity", "1.0");
}
