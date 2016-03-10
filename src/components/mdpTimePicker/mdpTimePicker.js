/* global moment, angular */
'use strict';

function TimePickerCtrl($scope, $mdMedia) {
	var self = this;
    this.VIEW_HOURS = 1;
    this.VIEW_MINUTES = 2;
    this.currentDate = Date.now();
    this.currentView = this.VIEW_HOURS;

    this.time = $scope.timepicker.ngModel ? moment($scope.timepicker.ngModel) : moment(this.currentDate);
    this.formattedTime = this.time.format('LT');

    this.clockHours = parseInt(this.time.format("h"));
    this.clockMinutes = parseInt(this.time.minutes());

	$scope.$mdMedia = $mdMedia;

	this.switchView = function() {
	    self.currentView = self.currentView == self.VIEW_HOURS ? self.VIEW_MINUTES : self.VIEW_HOURS;
	};

	this.setAM = function($event) {
        $event.stopPropagation();
        if(self.time.format("A") == "PM")
            self.time.hour(self.time.hour() - 12);
	};

    this.setPM = function($event) {
        $event.stopPropagation();
        if(self.time.format("A") == "AM")
            self.time.hour(self.time.hour() + 12);
	};

    this.confirm = function (theTime) {
        this.formattedTime = theTime.format('LT');
        this.ngModel = theTime.toDate();
    };

    this.cancel = function () {
    };

    this.cancelLabel = "Cancel";
    this.okLabel = "OK";
}

function ClockCtrl($scope) {
    var TYPE_HOURS = "hours";
    var TYPE_MINUTES = "minutes";
    var self = this;

    this.STEP_DEG = 360 / 12;
    this.steps = [];

    this.CLOCK_TYPES = {
        "hours": {
            range: 12,
        },
        "minutes": {
            range: 60,
        }
    };

    this.getPointerStyle = function() {
        var divider = 1;
        switch(self.type) {
            case TYPE_HOURS:
                divider = 12;
                break;
            case TYPE_MINUTES:
                divider = 60;
                break;
        }
        var degrees = Math.round(self.selected * (360 / divider)) - 180;
        return {
            "-webkit-transform": "rotate(" + degrees + "deg)",
            "-ms-transform": "rotate(" + degrees + "deg)",
            "transform": "rotate(" + degrees + "deg)"
        };
    };

    this.setTimeByDeg = function(deg) {
        deg = deg >= 360 ? 0 : deg;
        var divider = 0;
        switch(self.type) {
            case TYPE_HOURS:
                divider = 12;
                break;
            case TYPE_MINUTES:
                divider = 60;
                break;
        }

        self.setTime(
            Math.round(divider / 360 * deg)
        );
    };

    this.setTime = function(time, type) {
        this.selected = time;

        switch(self.type) {
            case TYPE_HOURS:
                if(self.time.format("A") == "PM") time += 12;
                this.time.hours(time);
                break;
            case TYPE_MINUTES:
                if(time > 59) time -= 60;
                this.time.minutes(time);
                break;
        }

    };

    this.init = function() {
        self.type = self.type || "hours";
        switch(self.type) {
            case TYPE_HOURS:
                for(var i = 1; i <= 12; i++)
                    self.steps.push(i);
                self.selected = self.time.hours() || 0;
                if(self.selected > 12) self.selected -= 12;

                break;
            case TYPE_MINUTES:
                for(var i = 5; i <= 55; i+=5)
                    self.steps.push(i);
                self.steps.push(0);
                self.selected = self.time.minutes() || 0;

                break;
        }
    };

    this.init();
}

module.directive("mdpClock", ["$timeout", function($timeout) {
    return {
        restrict: 'E',
        bindToController: {
            'type': '@?',
            'time': '='
        },
        replace: true,
        template: '<div class="mdp-clock">' +
                        '<div class="mdp-clock-container">' +
                            '<md-toolbar class="mdp-clock-center md-primary"></md-toolbar>' +
                            '<md-toolbar ng-style="clock.getPointerStyle()" class="mdp-pointer md-primary">' +
                                '<span class="mdp-clock-selected md-button md-raised md-primary"></span>' +
                            '</md-toolbar>' +
                            '<md-button ng-class="{ \'md-primary\': clock.selected == step }" class="md-icon-button md-raised mdp-clock-deg{{ ::(clock.STEP_DEG * ($index + 1)) }}" ng-repeat="step in clock.steps" my-click="clock.setTime(step)" md-prevent-menu-close="md-prevent-menu-close">{{ step }}</md-button>' +
                        '</div>' +
                    '</div>',
        controller: ["$scope", ClockCtrl],
        controllerAs: "clock",
        link: function(scope, element, attrs, ctrl) {
            var pointer = angular.element(element[0].querySelector(".mdp-pointer")),
                timepickerCtrl = scope.$parent.timepicker;

            var onEvent = function(event) {
                var containerCoords = event.currentTarget.getClientRects()[0];
                var x = ((event.currentTarget.offsetWidth / 2) - (event.pageX - containerCoords.left)),
                    y = ((event.pageY - containerCoords.top) - (event.currentTarget.offsetHeight / 2));

                var deg = Math.round((Math.atan2(x, y) * (180 / Math.PI)));
                $timeout(function() {
                    ctrl.setTimeByDeg(deg + 180);
                    if(["mouseup", "click"].indexOf(event.type) !== -1 && timepickerCtrl) timepickerCtrl.switchView();
                });
            };

            element.on("mousedown", function() {
               element.on("mousemove", onEvent);
            });

            element.on("mouseup", function(e) {
                element.off("mousemove", onEvent);
            });

            element.on("click", onEvent);
            scope.$on("$destroy", function() {
                element.off("click", onEvent);
                element.off("mousemove", onEvent);
            });
        }
    };
}]);

// Avoid closing the menu item on click.
module.directive('myClick', function ($parse, $rootScope) {
    return {
        restrict: 'A',
        compile: function ($element, attrs) {
            var fn = $parse(attrs.myClick, null, true);
            return function myClick(scope, element) {
                element.on('click', function (event) {
                    var callback = function () {
                        fn(scope, { $event: event });
                    };
                    scope.$apply(callback);
                });
            };
        }
    };
});

module.directive("mdpTimePicker", function() {
    return  {
        template: '<md-menu md-position-mode="target-right target" width="6"><md-input-container><input ng-model="timepicker.formattedTime" aria-label="The date" ng-click="$mdOpenMenu()"></md-input-container>' +
                '<md-menu-content class="mdp-timepicker-menu" layout-gt-xs="row">' +
                '<md-toolbar layout-gt-xs="column" layout-xs="row" layout-align="center center" flex class="mdp-timepicker-time md-hue-1 md-primary">' +
                    '<div class="mdp-timepicker-selected-time">' +
                        '<span ng-class="{ \'active\': timepicker.currentView == timepicker.VIEW_HOURS }" my-click="timepicker.currentView = timepicker.VIEW_HOURS">{{ timepicker.time.format("h") }}</span>:' +
                        '<span ng-class="{ \'active\': timepicker.currentView == timepicker.VIEW_MINUTES }" my-click="timepicker.currentView = timepicker.VIEW_MINUTES">{{ timepicker.time.format("mm") }}</span>' +
                    '</div>' +
                    '<div layout="column" class="mdp-timepicker-selected-ampm">' +
                        '<span my-click="timepicker.setAM($event)" ng-class="{ \'active\': timepicker.time.format(\'A\') == \'AM\' }">AM</span>' +
                        '<span my-click="timepicker.setPM($event)" ng-class="{ \'active\': timepicker.time.format(\'A\') == \'PM\' }">PM</span>' +
                    '</div>' +
                '</md-toolbar>' +
                '<div>' +
                    '<div class="mdp-clock-switch-container" ng-switch="timepicker.currentView" layout layout-align="center center">' +
                        '<mdp-clock class="mdp-animation-zoom" time="timepicker.time" type="hours" ng-switch-when="1"></mdp-clock>' +
                        '<mdp-clock class="mdp-animation-zoom" time="timepicker.time" type="minutes" ng-switch-when="2"></mdp-clock>' +
                    '</div>' +

                    '<md-dialog-actions layout="row">' +
                        '<span flex></span>' +
                        '<md-button ng-click="timepicker.cancel()" aria-label="{{timepicker.cancelLabel}}">{{timepicker.cancelLabel}}</md-button>' +
                        '<md-button ng-click="timepicker.confirm(timepicker.time)" class="md-primary" aria-label="{{timepicker.okLabel}}">{{timepicker.okLabel}}</md-button>' +
                    '</md-dialog-actions>' +
                '</div>' +
                '</md-menu-content></md-menu>',
        bindToController: true,
        controller: ["$scope", "$mdMedia", TimePickerCtrl],
        controllerAs: 'timepicker',
        scope: {
            "timeFormat": "@mdpFormat",
            "ngModel": "="
        }
    };
});
