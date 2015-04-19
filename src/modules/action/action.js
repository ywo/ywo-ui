(function(global, factory){
    if(this.define && define.amd) {
        define(factory);
    } else {
        this.action = factory();
    }
})(this, function(){
    var $ = window.Zepto;
    var $document = $(document);
    var domkey = 'ac-'; //默认ac-click;
    var callbacks = {
        // kind : {
        //     fun : xxx...
        // }
    };
    var listenTyes = {/*click:1, mousedown：1，。。。*/};
    var error = function(name) {
        console.error(name + ' is undefined');
    }
    var getValueFromObj = function(valueStr, obj) {
        var valueArr = valueStr.split(/\s*\.\s*/);
        var ret, i = 0;
        try{
            for(; i < valueArr.length; i++) {
                ret = (ret||obj)[valueArr[i]];
            }
        } catch(e){
            ret = undefined;
        }
        return ret;
    };
    var action = {
        listen : function(types) { //监听事件类型，默认只监听click
            types = types || '';
            types += ' click';
            types = $.trim(types).split(/\s+/);
            $.each(types, function(i, type){
                if(listenTyes[type]) return;
                listenTyes[type] = 1;
                console.log(type)
                var attr = domkey + type;
                $document.on(type, '[' + attr + ']', function(e){
                    // html: data-click="say, 1,..." 第一个为函数名，后面为实参
                    var $this = $(this);
                    var tmp = $this.attr(attr).trim().split(/\s*,\s*/);
                    var eventName = tmp[0],
                        args = tmp.splice(1);
                        args.push(e);
                    var callback = getValueFromObj(eventName, callbacks);
                    if(!callback) {
                       error(eventName);
                    } else {
                        callback.apply(this, args);
                    }
                });
            });
            return action;
        },
        add : function(events) {
            $.extend(callbacks, events);
            return action;
        },
        trigger: function(/*eventName, ...*/) {
            var args = Array.prototype.slice.call(arguments);
            var eventName = args[0];
            if(!callbacks[eventName]) {
                error(eventName)
            } else {
                callbacks[eventName].apply(null, args.slice(1));
            }
        },
        del: function(eventName) {
            delete callbacks[eventName];
            return action;
        },
        _dbg: function() {
            return callbacks;
        }
    }
    return action;
});