# The Lexstar 6000

Deep in the heart of central Kentucky, on a shelf in an otherwise-unimpressive engineering building on the campus of a former branch of IBM, there sits a monitor.  This monitor is connected to a computer.  This computer has been running a Chromium instance.  That Chromium instance has been pointed to this code.

This is the code for the Lexstar 6000, the finest weather Lexmark's Building 002 has to offer.

What started as a joke in 2011 turned into a Javascript experiment that has survived around five years and two buildings.  This simple kiosk has been dutifully reporting NOAA weather for the Lexington, KY area to employees of Lexmark ever since.  And, with this repository, it might even outlast Lexmark itself.

If you want to use this yourself, keep in mind a few things:

* This depends on a cron job downloading the appropriate NOAA weather report XML from their servers, as well as the national precipitation map as a GIF.  You're looking for http://www.weather.gov/xml/current_obs/KLEX.xml and http://radar.weather.gov/Conus/Loop/NatLoop.gif, respectively.  Make sure both of these go into the Lexstar top-level directory with those same names (KLEX.xml and NatLoop.gif).  This won't make any attempt to grab them itself, as that makes for cross-site security issues Javascript hates.

* It's currently entirely geared around Lexington, KY (specifically the NOAA weather station at Blue Grass Airport).  If you want it to point anywhere else, you'll have to rearrange locationdot and the map's "center" (really off to the west of center) yourself, as well as point it to a different NOAA XML file.

* Everything you see here was more or less cobbled together just to make it work, and as a practice experiment for what was at the time an upcoming Javascript project at work.  It's better than some code I've seen out there, but don't expect the most efficient uses of JQuery the world has ever seen.

* Last I knew, Firefox has major issues with garbage collection regarding reloading the national precipitation map in the background.  I honestly don't know if it still does (it did for several years with no indication on the devs' part that they had any interest in fixing it), but if you plan on running this using Firefox, be warned that it might crash after a few days.

* Alternatively, fork it and fix it yourself if you know what I'm doing wrong.
