angular.module('mapproxy_gui.tooltips', []).

/**
 * Loads a json dict from given URL
 *
 * Example dict:
 *
 * {
 *     'tooltipID': {
 *         'content': 'The tooltip content',
 *         'title': 'Popover title'
 *     }
 * }
 *
 * 'title' is optional. If provided, a popover is created, otherwise a tooltip is created
 *
 * In application initialization use tooltipMapper.loadDict(url) to specify and load the
 * tooltip dict
 *
 * Example:
 * app.run(function(tooltipMapper) {
 *     tooltipMapper.loadDict('[url_to_tooltip_dict]');
 * });
 */

factory('tooltipMapper', function($http, $rootScope) {
    var tooltipMapper = {
        tooltips: {},
        loaded: false,
        loadDict: function(url) {
            $http.get(url, {cache: false}).success(function(data) {
                tooltipMapper.tooltips = data;
                tooltipMapper.loaded = true;
                $rootScope.$broadcast('tooltipsLoaded');
            }); //XXXkai: error handling
        }
    };

    return tooltipMapper;
}).

/**
 * Example:
 *   <button tooltip="tooltipID"></button>
 * Description:
 *   Will look after tooltipID in tooltipMapper and create a tooltip with tooltipMapper.tooltips[tooltipID].content
 *   If tooltipMapper.tooltips[tooltipID].title is provided, a popover is created
 *
 * Example:
 *   <button tooltip tooltip-content="ToolTip"></button>
 * Description:
 *   Will create a tooltip with tooltip-content. don't lkook in tooltipMapper
 *   If tooltip-title is provided, a popover is created
 *
 * Other options:
 *   tooltip-placement: [left, right, top, bottom]
 */
directive('tooltip', function(tooltipMapper) {
    return {
        restrict: 'A',
        scope: 'element',
        link: function(scope, element, attrs) {
            var initPopover = function(content, title) {
                $(element).attr('title', content);
                $(element).tooltip({
                    content: function() {
                        return '<h5>' + title + '</h5><div class="text-center">' +content+'</div>';
                    },
                    position: preparePosition()
                });
            };
            var initTooltip = function(content) {
                $(element).attr('title', content);
                $(element).tooltip({
                    content: content,
                    position: preparePosition()
                });
            };
            var initFromService = function() {
                var tooltipData = tooltipMapper.tooltips[attrs.tooltip];
                if(angular.isUndefined(tooltipData)) {
                    return false;
                }

                if(angular.isDefined(tooltipData.title)) {
                    initPopover(tooltipData.content, tooltipData.title);
                } else {
                    initTooltip(tooltipData.content);
                }
            };
            var initFromAttrs = function(content, title) {
                if(angular.isDefined(title)) {
                    initPopover(content, title);
                } else {
                    initTooltip(content);
                }
            };
            var preparePosition  = function() {
                var at = scope.tooltipPlacement;
                var my;
                // my: position on tooltip to align with
                // at: position on element to align with
                switch(at) {
                    case 'left':
                        my = 'right';
                        break;
                    case 'right':
                        my = 'left';
                        break;
                    case 'top':
                        my = 'bottom';
                        break;
                    case 'bottom':
                        my = 'top';
                        break;
                }
                return {
                    my: my,
                    at: at+'+10'
                }
            };

            scope.tooltipPlacement = attrs.tooltipPlacement || 'right';

            if(angular.isDefined(attrs.tooltipContent)) {
                if(attrs.tooltipContent != "") {
                    initFromAttrs(attrs.tooltipContent, attrs.tooltipTitle);
                } else {
                    attrs.$observe('tooltipContent', function(val) {
                        if(angular.isDefined(val) && val!="") {
                            initFromAttrs(attrs.tooltipContent, attrs.tooltipTitle);
                        }
                    });
                }
            } else {
                if(attrs.tooltip != "") {
                    if(tooltipMapper.loaded) {
                        initFromService();
                    } else {
                        scope.$on('tooltipsLoaded', initFromService);
                    }
                } else {
                    attrs.$observe('tooltip', function(val) {
                        if(angular.isDefined(val) && val != "") {
                            if(tooltipMapper.loaded) {
                                initFromService();
                            } else {
                                scope.$on('tooltipsLoaded', initFromService);
                            }
                        }
                    });
                }
            }
        }
    };
});
