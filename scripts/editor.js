requirejs.config({
    shim: {
        'underscore': {
            exports: '_'
        }
    }
});

var diMacro =
  "macro di {\n" +
  "  case { _ ( function ($params:ident (,) ...) { $body ...} ) } => {\n" +
  "    var tokens = #{$params...}.map(function(t) { return makeValue(t.token.value, #{here}) });\n" +
  "    letstx $annotations... = tokens;\n" +
  "    return #{\n" +
  "      [ $annotations (,) ... , function ($params ...) {\n" +
  "        $body ...\n" +
  "      } ]\n" +
  "    }\n" +
  "  }\n" +
  "}\n";

require(["./sweet", "./syntax"], function(sweet, syn) {
    var storage_code = 'editor_code';
    var storage_mode = 'editor_mode';

    var starting_code = $("#editor").text();
    var compileWithSourcemap = $("body").attr("data-sourcemap") === "true";

    var editor = CodeMirror.fromTextArea($('#editor')[0], {
        lineNumbers: true,
        smartIndent: false,
        indentWithTabs: false,
        tabSize: 2,
        autofocus: true,
        mode: 'coffeescript',
        theme: 'solarized dark'
    });

    var currentStep = 1;

    if (window.location.hash) {
        editor.setValue(decodeURI(window.location.hash.slice(1)));
    } else {
        // editor.setValue(localStorage[storage_code] ? localStorage[storage_code] : starting_code);
    }
    if(localStorage[storage_mode]) {
        editor.setOption("keyMap", localStorage[storage_mode]);
    }

    var output = CodeMirror.fromTextArea($('#output')[0], {
        lineNumbers: true,
        theme: 'solarized dark',
        readOnly: true
    });

    $('#btn-vim').click(function() {
        editor.setOption('keyMap', 'vim');
        editor.focus();
        localStorage[storage_mode] = "vim";
    });
    $('#btn-emacs').click(function() {
        editor.setOption('keyMap', 'emacs');
        editor.focus();
        localStorage[storage_mode] = "emacs";
    });

    $('#btn-step').click(function() {
        var unparsedString = syn.prettyPrint(
            sweet.expand(editor.getValue(),
                         undefined,
                         currentStep++),
            $("#ck-hygiene").prop("checked"));
        $("#lab-step").text(currentStep);
        output.setValue(unparsedString);
    });

    var updateTimeout;
    editor.on("change", function(e) {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(updateExpand, 200);
    });

    function updateExpand() {
        var code = editor.getValue();
        try {
          var toCompile = diMacro + "\n" + CoffeeScript.compile(code, {bare: true});
        } catch (e) {
          $('#errors').show();
          $('#errors').text('Error compiling CoffeeScript: ' + e.message);
          return;
        }

        var expanded, compiled, res;
        window.location = "index.htm#" + encodeURI(code);
        localStorage[storage_code] = code;
        try {
            if (compileWithSourcemap) {
                res = sweet.compile(toCompile, {
                    sourceMap: true,
                    filename: "test.js",
                    readableNames: true
                });
            } else {
                res = sweet.compile(toCompile, {
                    sourceMap: false,
                    readableNames: true
                });
            }
            compiled = res.code.replace(/    /g, '  ');
            output.setValue(compiled);

            $('#errors').text('');
            $('#errors').hide();
        } catch (e) {
            $('#errors').text(e);
            $('#errors').show();
        }
    }
    updateExpand();
});
