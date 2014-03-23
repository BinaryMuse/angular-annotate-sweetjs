CoffeeScript/AngularJS/Sweet.js Annotation
==========================================

The Problem
-----------

AngularJS' dependency injection system uses the parameters of a function to determine which dependencies to inject. For example:

```javascript
app.controller('SomeController', function($scope, $http) {
  // ...
});
```

Instances of `SomeController` will automatically passed `$scope` and `$http` parameters because those are the services named in the function. The problem comes after minifying--the code above might be turned into somthing like

```javascript
a.controller('SomeController', function(b, c) {
  // ...
});
```

Angular has no way of knowing what `b` and `c` used to be, so your dependency injection breaks.

### Manual Annotation

Angular provides a workaround--any function that works with its injector can also be specified as an array where the first elements match up with the *names* of the services, and the function can take parameters of any name. For instance,

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

Even with a pluggable annotation system, which would allow users to write their own AST detection, keeping track of all the various places that functions are defined and then invoked by the injector is difficult and brittle.

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

The macro will convert code like this:

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

The use is similar to ngmin--run this on your unminified code before you minify it. There are plugins on npm for Grunt, Gulp, and Browserify, and the Sweet.js API is super easy to use.

Demo
----

Check out the macro on [the Sweet.js web site](http://sweetjs.org/browser/editor.html#macro%2520di%2520%257B%250A%2520%2520case%2520%257B%2520_%2520%28%2520function%2520%28%24params%3Aident%2520%28%2C%29%2520...%29%2520%257B%2520%24body%2520...%257D%2520%29%2520%257D%2520%3D%253E%2520%257B%250A%2520%2520%2520%2520var%2520tokens%2520%3D%2520%23%257B%24params...%257D.map%28function%28t%29%2520%257B%2520return%2520makeValue%28t.token.value%2C%2520%23%257Bhere%257D%29%2520%257D%29%3B%250A%2520%2520%2520%2520letstx%2520%24annotations...%2520%3D%2520tokens%3B%250A%2520%2520%2520%2520return%2520%23%257B%250A%2520%2520%2520%2520%2520%2520%255B%2520%24annotations%2520%28%2C%29%2520...%2520%2C%2520function%2520%28%24params%2520...%29%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520%24body%2520...%250A%2520%2520%2520%2520%2520%2520%257D%2520%255D%250A%2520%2520%2520%2520%257D%250A%2520%2520%257D%250A%257D%250A%250Aapp.controller%28%27SomeController%27%2C%2520di%28function%28%24scope%2C%2520%24http%2C%2520%24injector%29%2520%257B%250A%2520%2520%24http.get%28%27...%27%29%3B%250A%257D%29%29%3B); you can also check out [this CoffeeScript version I built](http://binarymuse.github.io/angular-annotate-sweetjs/) based off the same code.
