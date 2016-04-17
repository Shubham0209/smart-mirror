(function(angular) {
    'use strict';

    function MirrorCtrl(
            AnnyangService,
            GeolocationService,
            WeatherService,
            MapService,
            HueService,
            CalendarService,
            XKCDService,
            GiphyService,
            TrafficService,
            TodoService,
            RssService,
            $scope, $timeout, $interval) {
        var _this = this;
        var DEFAULT_COMMAND_TEXT = 'Say "What can I say?" to see a list of commands...';
        $scope.listening = false;
        $scope.debug = false;
        $scope.focus = "default";
        $scope.user = {};
        $scope.interimResult = DEFAULT_COMMAND_TEXT;
        $scope.showCalendar = true;
        $scope.showTodo     = true;
		$scope.showTraffic  = config.traffic.serviceActive;

        //Update the time
        function updateTime(){
            $scope.date = new Date();
        }

        // Reset the command text
        var restCommand = function(){
          $scope.interimResult = DEFAULT_COMMAND_TEXT;
        }

        _this.init = function() {
            var tick = $interval(updateTime, 1000);
            updateTime();
            GeolocationService.getLocation({enableHighAccuracy: true}).then(function(geoposition){
                console.log("Geoposition", geoposition);
                $scope.map = MapService.generateMap(geoposition.coords.latitude+','+geoposition.coords.longitude);
            });
            restCommand();

            var refreshWeather = function() {
			    console.log("Refreshing weather");
                //Get our location and then get the weather for our location
                GeolocationService.getLocation({enableHighAccuracy: true}).then(function(geoposition){
                    console.log("Geoposition", geoposition);
                    WeatherService.init(geoposition).then(function(){
                        $scope.currentForcast = WeatherService.currentForcast();
                        $scope.weeklyForcast = WeatherService.weeklyForcast();
                        $scope.hourlyForcast = WeatherService.hourlyForcast();
                        console.log("Current", $scope.currentForcast);
                        console.log("Weekly", $scope.weeklyForcast);
                        console.log("Hourly", $scope.hourlyForcast);
                    });
                }, function(error){
                    console.log(error);
                });
            };
			
            var refreshCalendar = function () {    
                console.log("Refreshing calendar");	
                CalendarService.getCalendarEvents().then(function(response) {
                    $scope.calendar = CalendarService.getFutureEvents();
                }, function(error) {
                    console.log(error);
                });
            };

            var refreshGreeting = function () {     
                console.log("Refreshing greeting");			
                if(!Array.isArray(config.greeting) && typeof config.greeting.midday != 'undefined') {
                    var hour = moment().hour();
                    var geetingTime = "midday";

                    if (hour > 4 && hour < 11) {
                        geetingTime = "morning";
                    } else if (hour > 18 && hour < 23) {
                        geetingTime = "evening";
                    } else if (hour >= 23 || hour < 4) {
                        geetingTime = "night";
                    }

                    $scope.greeting = config.greeting[geetingTime][Math.floor(Math.random() * config.greeting.morning.length)];
                }else if(Array.isArray(config.greeting)){
                    $scope.greeting = config.greeting[Math.floor(Math.random() * config.greeting.length)];
                }
            };

            var refreshTodoList = function () {
                console.log ("Refreshing Todo List");
                TodoService.refreshTodoList().then(function(data) {
                    $scope.todo = TodoService.getTaskList();
                    console.log("ToDo List ", $scope.todo);
                }, function(error) {
                    console.log(error);
                });
            };

            var refreshRss = function () {
                console.log ("Refreshing RSS");
                $scope.news = null;
                RssService.refreshRssList();
            };

            var updateNews = function() {
                $scope.news = RssService.getNews();
            };

            var refreshComic = function () {
            	console.log("Refreshing comic");
            	XKCDService.initDilbert().then(function(data) {
            		console.log("Dilbert comic initialized");
            	}, function(error) {
            		console.log(error);
            	});
            };

            refreshWeather();
            $interval(refreshWeather, config.forcast.refreshInterval * 60000);  
			
            refreshCalendar();
            $interval(refreshCalendar, config.calendar.refreshInterval * 60000);  
			
            refreshGreeting();
            $interval(refreshGreeting, 120000);  // 2 minutes

            refreshTodoList();
            $interval(refreshTodoList, config.todo.refreshInterval * 60000);

            refreshComic();
            $interval(refreshTodoList, 12*60*60000); // 12 hours

            refreshRss();
            $interval(refreshRss, config.rss.refreshInterval * 60000);

            updateNews();
            $interval(updateNews, 8000);

            var refreshTrafficData = function() {
                TrafficService.getTravelDuration().then(function(durationTraffic) {
                    console.log("Traffic", durationTraffic);
                    $scope.traffic = {
                        destination:config.traffic.name,
                        hours : durationTraffic.hours(),
                        minutes : durationTraffic.minutes()
                    };
                }, function(error){
                    $scope.traffic = {error: error};
                });
            };

            if (config.traffic.serviceActive) {
              refreshTrafficData();
              $interval(refreshTrafficData, config.traffic.refreshInterval * 60000);
            } 
            else {
              console.log ("Traffic service disabled.");
            }

            var defaultView = function() {
                console.debug("Ok, going to default view...");
                responsiveVoice.speak("Ok going to default view now");
                $scope.focus = "default";
            }

            // List commands
            AnnyangService.addCommand('What can I say', function() {
                console.debug("Here is a list of commands...");
                responsiveVoice.speak("Here is a list of commands...");
                console.log(AnnyangService.commands);
                $scope.focus = "commands";
            });

            // Go back to default view
            AnnyangService.addCommand('Go home', defaultView);

            // Hide everything and "sleep"
            AnnyangService.addCommand('(Go to) sleep', function() {
                console.debug("Ok, going to sleep...");
                responsiveVoice.speak("Ok, going to sleep...");
                $scope.focus = "sleep";
            });

            // Go back to default view
                        AnnyangService.addCommand('Wake up', function(){
            				setTimeout(function(){
					responsiveVoice.speak("Hello " + $scope.user.name + " how can i help you?");
				}, 3000);
				$scope.focus = "default";
			});


            // Hide everything and "sleep"
            AnnyangService.addCommand('Show debug information', function() {
                console.debug("Boop Boop. Showing debug info...");
                responsiveVoice.speak("Boop Boop. Showing debug info...");
                $scope.debug = true;
            });

            // Hide everything and "sleep"
            AnnyangService.addCommand('Show map', function() {
                console.debug("Going on an adventure?");
                responsiveVoice.speak("Showing map of your current location");
                    GeolocationService.getLocation({enableHighAccuracy: true}).then(function(geoposition){
                    console.log("Geoposition", geoposition);
                    $scope.map = MapService.generateMap(geoposition.coords.latitude+','+geoposition.coords.longitude);
                    $scope.focus = "map";
                });
             });

            // Hide everything and "sleep"
            AnnyangService.addCommand('Show (me a) map of *location', function(location) {
                console.debug("Getting map of", location);
                responsiveVoice.speak("Getting map of"+location+"...It might take some time");
                $scope.map = MapService.generateMap(location);
                $scope.focus = "map";
            });

            // Zoom in map
            AnnyangService.addCommand('(map) zoom in', function() {
                console.debug("Zoooooooom!!!");
                responsiveVoice.speak("zooming into the map");
                $scope.map = MapService.zoomIn();
            });

            AnnyangService.addCommand('(map) zoom out', function() {
                console.debug("Moooooooooz!!!");
                responsiveVoice.speak("zooming out of the map");
                $scope.map = MapService.zoomOut();
            });

            AnnyangService.addCommand('(map) zoom (to) *value', function(value) {
                console.debug("Moooop!!!", value);
                responsiveVoice.speak("zooming to"+value);
                $scope.map = MapService.zoomTo(value);
            });

            AnnyangService.addCommand('(map) reset zoom', function() {
                console.debug("Zoooommmmmzzz00000!!!");
                responsiveVoice.speak("resetting the map zoom");
                $scope.map = MapService.reset();
                $scope.focus = "map";
            });

            // Search images
            AnnyangService.addCommand('Show me *term', function(term) {
                console.debug("Showing", term);
            });

            // Change name
            AnnyangService.addCommand('My (name is)(name\'s) *name', function(name) {
                console.debug("Hi", name, "nice to meet you");
                responsiveVoice.speak("Hi " + name + " it's good to see you. My name is Jarvis.L.O.L");
                $scope.user.name = name;
            });

            // Set a reminder
            AnnyangService.addCommand('Remind me to *task', function(task) {
                console.debug("I'll remind you to", task);
            });

            // Clear reminders
            AnnyangService.addCommand('Clear reminders', function() {
                console.debug("Clearing reminders");
            });

            // Clear log of commands
            AnnyangService.addCommand('Clear results', function(task) {
                 console.debug("Clearing results");
            });

            // Check the time
            AnnyangService.addCommand('what time is it', function(task) {
                 console.debug("It is", moment().format('h:mm:ss a'));
                 responsiveVoice.speak("It is"+ moment().format('h:mm:ss a'));
            });

            // Turn lights off
            AnnyangService.addCommand('(turn) (the) :state (the) light(s) *action', function(state, action) {
                HueService.performUpdate(state + " " + action);
            });

            //Show giphy image
            AnnyangService.addCommand('get *img', function(img) {
                GiphyService.init(img).then(function(){
                responsiveVoice.speak("OK showing the giphy of"+ img);
                    $scope.gifimg = GiphyService.giphyImg();
                    $scope.focus = "gif";
                });
            });

            // Show xkcd comic
            AnnyangService.addCommand('Show (a) comic', function(state, action) {
                console.debug("Fetching a comic for you.");
                responsiveVoice.speak("OK " + $scope.user.name + "Fetching a comic for you." );
                XKCDService.getXKCD().then(function(data){
                    $scope.xkcd = data.img;
                    $scope.focus = "comic";
                });
            });

            // Show Dilbert comic
            AnnyangService.addCommand('Show Dilbert (comic)', function(state, action) {
                console.debug("Fetching a Dilbert comic for you.");
                 responsiveVoice.speak("OK " + $scope.user.name + "Fetching a dilbert comic for you." );
                $scope.dilbert = XKCDService.getDilbert("today");
                $scope.focus = "dilbert";
            });


            // Hide a section 
            AnnyangService.addCommand('Hide (the) *section', function(section) {
                switch (section) {
                  case 'calendar':
                    $scope.showCalendar = false;
                    console.debug("Hiding the ", section);
                    responsiveVoice.speak("OK.. task is taken care of.");
                    break;
                  case 'reminders':
                    $scope.showTodo = false;
                    console.debug("Hiding the ", section);
                    responsiveVoice.speak("OK.. task is taken care of.");
                  break;
                    default:
                    console.debug("I can't hide ", section);
                    responsiveVoice.speak("Don't trick me into this boy.");
                  break;
                };
            });
			
            // Show a section
            AnnyangService.addCommand('Show (the) *section', function(section) {
                switch (section) {
                  case 'calendar':
                     $scope.showCalendar = true;
                     console.debug("Showing the ", section);
                     responsiveVoice.speak("OK.. task is taken care of.");
                     break;
                  case 'reminders':
                     $scope.showTodo = true;
                     console.debug("Showing the ", section);
                     responsiveVoice.speak("OK.. task is taken care of.");
                     break;
                  default:
                     console.debug("I can't show ", section);
                     responsiveVoice.speak("Don't trick me into this boy.");
                     break;
                };
			});

            // Delete task id - id is the display id 1, 2, etc...
            AnnyangService.addCommand('Delete task *id', function(id) {
                TodoService.removeTask(id).then(function(){
                	responsiveVoice.speak("OK task"+ id + "marked as complete, well done!");
                    setTimeout(refreshTodoList, 1000);
                });
            });

            // Add task - just say task description
            AnnyangService.addCommand('Add task *id', function(id) {
                TodoService.addTask(id).then(function(){
                	responsiveVoice.speak("OK " + $scope.user.name + " i will remind you to" + id);
                    setTimeout(refreshTodoList, 1000);
                });
            });

            // Refresh Reminders
            AnnyangService.addCommand('Refresh reminder', refreshTodoList);

            // Refresh Calendar
            AnnyangService.addCommand('Refresh calendar', refreshCalendar);


            AnnyangService.addCommand('(How is) Current weather', function() {
                responsiveVoice.speak ('Currently it is'+ WeatherService.currentForcast().summary + ' and ' + WeatherService.currentForcast().temperature + 'degrees.');
            });

            // Fallback for all commands
            AnnyangService.addCommand('*allSpeech', function(allSpeech) {
                console.debug(allSpeech);
            });

            var resetCommandTimeout;
            //Track when the Annyang is listening to us
            AnnyangService.start(function(listening){
                $scope.listening = listening;
            }, function(interimResult){
                $scope.interimResult = interimResult;
                $timeout.cancel(resetCommandTimeout);
            }, function(result){
                $scope.interimResult = result[0];
                resetCommandTimeout = $timeout(restCommand, 5000);
            });
        };

        _this.init();
    }

    angular.module('SmartMirror')
        .controller('MirrorCtrl', MirrorCtrl);

}(window.angular));
