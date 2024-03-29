;(function (global, factory) {
    if(global.define && define.amd) {
        define(factory);
    } else {
        global.Suggest = factory();
    }
})(this, function () {
    var NULL = null, FALSE = false, TRUE = true, NOOP = function(){};
    var document = window.document;
    var encode = encodeURIComponent;
    var tmpl = (function () {
        var cache = {};
        return function tpl(str, data) {
            var fn = !/\W/.test(str) ?
                cache[str] = cache[str] :
            new Function ('obj',
            'var p=[],print=function(){p.push.apply(p,arguments);};' +
            "with(obj){p.push('" +
            str
                .replace(/[\r\t\n]/g, " ")
                .split("<#").join("\t")
                .replace(/((^|#>)[^\t]*)'/g, "$1\r")
                .replace(/\t-(.*?)#>/g, "',$1,'")
                .replace(/\t=(.*?)#>/g, "',$1.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;').replace(/\\s/g,' '),'")
                .split("\t").join("');")
                .split("#>").join("p.push('")
                .split("\r").join("\\'")
            + "');}return p.join('');");
            return data ? fn(data) : fn;
        };
    })();

    var gid = 0;
    var defaults  = {
        emptyCls      : 'empty',
        classel       : '',
        wrap          : '',
        suggestNumber : 6,
        api           : '',
        itemTpl       : '',
        emptyTpl      : '<#=query#>未找到',
        /**
         *
          处理数据源成sug内容约定的格式
         * @param  {object} data [传入的对象]
         * @callback {
         *    query : 'query', default : ''
         *    data : []  default: []
         * }
         */

        formatData: function (data, next){
            next(data);
        },
        onempty : NOOP
    };

    function Suggest(params) {
        return new Suggest.fn.init(params);
    }

    Suggest.fn = Suggest.prototype = {
        _cache : {
            queries : {},
        },
        elements: {
            $wrap         : NULL, // 父容器，position应为relative
            $input        : NULL, // 事件文本框
            $form         : NULL,
            $content      : NULL,
            $clearHistory : NULL,
            $close        : NULL,
            $classel      : NULL,
        },
        init : function(params){
            var suggest = this;
            var elements = suggest.elements;
            gid++;
            suggest.cfg = $.extend({}, defaults, params);
            elements.$input = $(params.input);
            elements.$classel = suggest.cfg.classel ? $(suggest.cfg.classel) : elements.$input;
            elements.$wrap = suggest.cfg.wrap ? $(suggest.cfg.wrap) : elements.$input.parent();
            elements.$form = elements.$input.parents('form');
            elements.$suggest = elements.$wrap.find('.suggest');
            if(!elements.$suggest.length) {
                elements.$suggest = $(suggest.templates.layout).appendTo(elements.$wrap);
            }
            elements.$content = elements.$wrap.find('.suggest-content');
            elements.$wrap.css('position', 'relative');
            elements.$input.attr('autocomplete', 'off');
            suggest.query =  elements.$input.val();

            suggest._bindEvnet();
        },
        on: function(event, selector, callback) {
            var suggest = this;
            suggest.elements.$wrap.on(event, selector, function(){
                callback.apply(suggest, arguments);
            });
        },
        trigger: function(event){
            var suggest = this;
            suggest.elements.$wrap.trigger(event);
        },
        _bindEvnet: function(){
            var suggest = this;
            suggest.on('search', $.proxy(suggest._renderItem, suggest));

            // dom event
            suggest.elements.$input.on('input focusin keyup', $.proxy(suggest._renderItem, suggest));

            suggest.elements.$suggest.on('click', '.suggest-item-add', function(e){
                suggest._handlers.sp.call(this, e, suggest);
            }).on('click', '.suggest-close', function(e){
                suggest._handlers.close.call(this, e, suggest);
            }).on('click', '.suggest-item-title', function(e){
                suggest._handlers.search.call(this, e, suggest);
            });
        },
        _handlers: {
            sp : function(e, suggest) {
                e.preventDefault();
                var $this = $(this);
                var $item = $this.parent('.suggest-item');
                var kw = $item.data('kw');
                suggest.elements.$input.val(kw);
            },
            search: function(e, suggest){
                e.preventDefault();
                var $this = $(this);
                var $item = $this.parent('.suggest-item');
                $item.find('.suggest-item-add').trigger('click');
                suggest.elements.$form.submit();
                suggest.hide();
            },
            close: function(e, suggest) {
                suggest.hide();
            }
        },
        _getData: function(query, callback){
            callback = callback || NOOP;
            var suggest = this;
            var cacheData = suggest._cache.queries[query];
            if(cacheData) {
                suggest.cfg.formatData(cacheData, function(formatedResult){
                    callback(formatedResult);
                })
            } else {
                $.ajax({
                    cache: true,
                    url : suggest.cfg.api.replace('%s', encode(query)),
                    // jsonpCallback: 'Suggest' + gid,
                    success: function(result){
                        suggest._cache.queries[query] = result;
                        suggest.cfg.formatData(result, function(formatedResult){
                            // TODO: 高亮query
                            // result = result.forEach(function(){
                            //     var kw =  String(sugData.query).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
                            //     return string.replace(new RegExp('(' + kw + ')', 'i') , '<strong>$1</strong>');
                            // });
                            // formatedResult = {query: '', data:[]}

                            callback(formatedResult);
                            if(!formatedResult.data.length) {
                                suggest.cfg.onempty.call(suggest);
                            }
                        });

                    }
                });
                // $.getJSON(suggest.cfg.api.replace('%s', encode(query)), function(result){

                // });
            }
        },
        _renderItem: function() {
            var suggest = this;
            var itemTpl = suggest.cfg.itemTpl || suggest.templates.itemTpl;
            var elements = suggest.elements,
                $classel = elements.$classel,
                $content = elements.$content,
                $input = elements.$input;
            var query = $.trim($input.val());
            if(query && query === suggest.query) {
                return;
            } else {
                suggest.query = query;
            }

            $classel[query ? 'removeClass' : 'addClass'](suggest.cfg.emptyCls);
            suggest._getData(query, function(result){
                if($.trim($input.val()) !== result.query) {return;}
                var html = [];
                if(result.data.length) {
                    $.each(result.data.slice(0, suggest.cfg.suggestNumber), function(i, o){
                        html.push(tmpl(itemTpl, {
                            item : o,
                            query : suggest.query
                        }));
                    });
                } else {
                    html.push(tmpl(suggest.cfg.emptyTpl, {
                        query: suggest.query
                    }));
                }

                html = html.join('');
                if(html){
                    $content.html(html);
                    suggest.show();
                } else {
                    suggest.hide();
                }
            });
        },
        show: function(){
            var suggest = this;
            suggest.elements.$suggest.show();
        },
        hide: function(){
            var suggest = this;
            suggest.elements.$suggest.hide();
        },

        templates: {
            layout :
                '<div class="suggest">' +
                    '<div class="suggest-content"></div>' +
                    '<div class="suggest-toolbar">' +
                        '<button class="suggest-clearhistory">清除历史记录</button>' +
                        '<button class="suggest-close">关闭</button>' +
                    '</div>' +
                '</div>',
            itemTpl :
                '<div class="suggest-item" data-kw=<#=item.kw#>>' +
                    '<button class="suggest-item-title"><#=item.kw#></button>' +
                    '<button class="suggest-item-add"></button>' +
                '</div>',
        }

    }
    Suggest.fn.init.prototype = Suggest.prototype;
    return Suggest;
});