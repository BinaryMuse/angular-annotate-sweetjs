AngularJS DI Annotation with Sweet.js
=====================================

Annotating AngularJS DI-able functions with Sweet.js:

* [JavaScript Demo](http://bit.ly/1fSCVnw)
* [CoffeeScript Demo](http://binarymuse.github.io/angular-annotate-sweetjs/index.htm)

The Problem
-----------

AngularJS' dependency injection system uses the parameters of a function to determine which dependencies to inject. For example:

```javascript
app.controller('SomeController', function($scope, $http) {
  // ...
});
```

Instances of `SomeController` will automatically be passed instances of the `$scope` and `$http` services because those are the services named in the parameter list. The problem comes after minifying; the code above might be turned into something like

```javascript
a.controller('SomeController', function(b, c) {
  // ...
});
```

Angular has no way of knowing what `b` and `c` used to be, so your dependency injection breaks.

### Manual Annotation

Angular provides a workaround—any function that works with its injector can also be specified as an array where the first elements match up with the *names* of the services, and the function can take parameters of any name. For instance,

```javascript
app.controller('SomeController', ['$scope', '$http', function($scope, $http) {
  // ...
}]);
```

might be turned into

```javascript
a.controller('SomeController', ['$scope', '$http', function(b, c) {
  // ...
}]);
```

and Angular knows what to inject based on the strings in the array.

The problem with this solution is that it is error prone; the array gets out of sync with the function parameters, and the injection breaks again.

### ngmin

Brian Ford created a great Node.js library called [ngmin](https://github.com/btford/ngmin) that detects many common function definitions and automatically converts them into array-annotated functions for you.

However, ngmin inspects the AST and tries to intelligently guess whether the functions you've provided should be annotated. This works great for the built-in common cases, like `.controller` and `.factory`, but not so great in less common ones like the `resolve` functions of routers, or manual calls to `$injector.invoke`.

Even with a pluggable annotation system, which would allow users to write their own custom AST passes, keeping track of all the various places that functions are defined and then invoked by the injector is difficult and brittle.

Sweet.js
--------

The solution I've developed here is based on [Sweet.js](http://sweetjs.org/), which allows you to write macros for JavaScript. I've created a `di` macro that, when passed a function, will emit an array-annotated function for you.

This is the macro:

```javascript
macro di {
  case { _ ( function ($params:ident (,) ...) { $body ...} ) } => {
    var tokens = #{$params...}.map(function(t) { return makeValue(t.token.value, #{here}) });
    letstx $annotations... = tokens;
    return #{
      [ $annotations (,) ... , function ($params ...) {
        $body ...
      } ]
    }
  }
}
```

To use, simply wrap any function declaration that needs to work with the injector in `di()`. The macro will convert code like this:

```javascript
app.controller('SomeController', di(function($scope, $http, $injector) {
  $http.get('...');
}));
```

into this:

```javascript
app.controller('SomeController', [
  '$scope',
  '$http',
  '$injector',
  function ($scope, $http, $injector) {
    $http.get('...');
  }
]);
```

You can also use the macro with function references; simply wrap the function *declaration* (not the invocation).

```javascript
var fn = di(function($rootScope) {
});
$injector.invoke(fn);
```

is converted into

```javascript
var fn = ['$rootScope', function ($rootScope) {
}];
$injector.invoke(fn);
```

The use case is similar to ngmin—run this on your unminified code before you minify it. There are Sweet.js plugins on npm for Grunt, Gulp, and Browserify, and the Sweet.js API is super easy to use, so it shouldn't be too hard to run in other contexts.

While the process is not as automatic as something like ngmin, as you do need to remember to use the `di` macro, it *will* automatically keep the array up to date as the parameters change and is not subject to most of the drawbacks of an AST detection system like ngmin.

Demo
----

Check out the macro on [the Sweet.js web site](http://bit.ly/1fSCVnw); you can also check out [this CoffeeScript version I built](http://binarymuse.github.io/angular-annotate-sweetjs/index.htm) based off the same code.
