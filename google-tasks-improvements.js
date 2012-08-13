(function () {
    // wait until the table is set
    if (document.querySelector('iframe') == null
            || document.querySelector('iframe').contentDocument == undefined
            || document.querySelector('iframe').contentDocument.querySelector('table.v') == undefined) {
        return setTimeout(arguments.callee, 33);
    }

    var contentDocument = document.querySelector('iframe').contentDocument;

    $('head', contentDocument).append('<link rel="stylesheet" type="text/css" href="' + chrome.extension.getURL('iframe.css') + '" />');

    var lineHighlights = [
        {
            regexp: /→/,
            className: 'arrow'
        },
        {
            regexp: /\(x\)/,
            className: 'error'
        },
        {
            regexp: /\/!\\/,
            className: 'warning'
        },
        {
            regexp: /★/,
            className: 'filled-star'
        },
        {
            regexp: /☆/,
            className: 'empty-star'
        }
    ];

    // TODO: Switch to stylesheet instead of inline styles
    var labelHighlights = [
        {
            regexp: /\B@\w[\w-]*/,
            style: {
                backgroundColor: '#EBDBDE',
                color: '#662E37',
                padding: '0 3px'
            }
        },
        {
            regexp: /\B\#\w[\w-]*/,
            style: {
                backgroundColor: '#B3EFD3',
                color: '#04A75B',
                padding: '0 3px'
            }
        },
        {
            regexp: /\B\+\w[\w-]*/,
            style: {
                backgroundColor: '#F3E7B2',
                color: '#AB8B01',
                padding: '0 3px'
            }
        },
        {
            regexp: /\{\d+\}/,
            style: {
                backgroundColor: 'red',
                color: 'white',
                fontWeight: 'bold',
                padding: '0 3px'
            }
        }
    ];
    var allLabelHighlightsRegexp = new RegExp('('+$.map(labelHighlights, function (value, i) {
        return value.regexp.toString().replace(/^\/|\/$/g, '');
    }).join('|')+')', 'g');

    function setCaret(node, offset) {
        var range = contentDocument.createRange();
        range.setStart(node, offset);
        range.collapse(true);
        contentDocument.getSelection().removeAllRanges();
        contentDocument.getSelection().addRange(range);
    }

    function stylizeByTextElement(e) {
        if (e == undefined || e.data == undefined || $(e.parentNode).closest('div.d').length == 0) return;

        // Line highlighting
        // Because of label highlighting, multiple text nodes are being created for the same row of text; thus we need to evaluate line-based highlighting separately.
        var lineData = $(e.parentNode).closest('div.d').text();
        var lineHighlighted = false;
        lineHighlights.forEach(function (lineHighlight) {
            // clear any previous highlights
            $(e.parentElement).closest('tr').find('td').removeClass(lineHighlight.className);

            // apply new highlight, if not already highlighted and there's match
            if (lineHighlighted) return;
            if (lineData.match(lineHighlight.regexp)) {
                $(e.parentElement).closest('tr').find('td').addClass(lineHighlight.className);
                lineHighlighted = true;
            }
        });

        // Label highlighting
        /* XXX: If new text is added outside a label that would fit the label, it's not properly added to the label;
         * How to replicate:
         * 1. Type "Foo bar +label me here"; "{+label}" becomes a label
         * 2. Place caret before the "me" word, and delete the space before that word.
         * → result is "Foo bar {+label}me here"
         * → result should be "Foo bar {+labelme} here"
         */
        /* XXX: Because splitText is used a lot, we sometimes end up with consecutive text nodes that should match a label but can't;
         * How to replicate:
         * 1. Type "Mega mega +omega"; "{+omega} becomes a label
         * 2. Delete the + in the label
         * 3. Add a + in front of the word "omega"
         * → result is no label
         * → result should be the label "{+omega}"
         *
         * What happens is that during step 2, when the label is broken, the text node in that label is placed inside the parentNode,
         * but it's never merged with the rest of the textNodes. Thus when CDATA changes events are fired, each of those nodes are 
         * seen as edited independently.
         */
        // save the caret, if any
        var selectionInfo = contentDocument.getSelection();
        if (selectionInfo && selectionInfo.focusNode == e) selectionInfo = { focusOffset: selectionInfo.focusOffset }; // only care about the caret in this text node
        else selectionInfo = null;

        // editing a label
        // possible actions: update or delete label
        if ($(e.parentElement).is('span.label')) {
            var label = e.parentElement;
            var div = label.parentElement;
            // does the regex still hold?
            if (e.data.match(label.regexp)) {
                // y: move beginning bits and ending bits outside of the SPAN element
                var parenthesisRegexp = new RegExp("("+label.regexp.toString().replace(/^\/|\/$/g, '')+")");
                var newText = e.data.replace(parenthesisRegexp, "\0$1\0").split("\0");
                var eNow = e, eNew;
                if (newText[0].length > 0) {
                    eNew = eNow.splitText(newText[0].length);
                    div.insertBefore(eNow, label);

                    // is there a saved caret? restore the caret
                    if (selectionInfo && selectionInfo.focusOffset < newText[0].length)
                        setCaret(eNew, selectionInfo.focusOffset);

                    eNow = eNew;
                }
                if (newText[2].length > 0) {
                    eNew = eNow.splitText(newText[1].length);
                    div.insertBefore(eNew, label.nextSibling);

                    // is there a saved caret? restore the caret
                    if (selectionInfo && selectionInfo.focusOffset > newText[0].length + newText[1].length)
                        setCaret(eNew, selectionInfo.focusOffset - newText[0].length - newText[1].length);
                }
            } else {
                // n: break the span element
                div.insertBefore(e, label);
                div.removeChild(label);

                // is there a saved caret? restore the caret
                if (selectionInfo)
                    setCaret(e, selectionInfo.focusOffset);
            }
        } 

        // editing a part of the main task
        // possible action: create label
        else if ($(e.parentElement).is('div.d')) {

            // split the node by matching labels
            var newText = e.data.replace(allLabelHighlightsRegexp, "\0$1\0").split("\0");
            if (newText.length > 1) {
                var eNow = e, eNext, label;
                var labelsToProcess = [], offset = 0;
                for (var k = 0; k < newText.length-1; k += 2) {
                    eNext = eNow.splitText(newText[k].length);
                    label = contentDocument.createElement('span');
                    label.className = 'label';
                    labelsToProcess.push(label);
                    eNow.parentNode.insertBefore(label, eNext);

                    // is there a saved caret? restore the caret
                    if (selectionInfo && selectionInfo.focusOffset < offset + newText[k].length) {
                        setCaret(eNow, selectionInfo.focusOffset - offset);
                        selectionInfo = null;
                    }
                    offset += newText[k].length;

                    eNow = eNext.splitText(newText[k+1].length);
                    label.appendChild(eNext);

                    // is there a saved caret? restore the caret
                    if (selectionInfo && selectionInfo.focusOffset < offset + newText[k+1].length) {
                        setCaret(eNext, selectionInfo.focusOffset - offset);
                        selectionInfo = null;
                    }
                    offset += newText[k+1].length;
                }

                // is there a saved caret? restore the caret
                if (selectionInfo && selectionInfo.focusOffset <= offset + newText[k].length) {
                    setCaret(eNow, selectionInfo.focusOffset - offset);
                    selectionInfo = null;
                }

                labelsToProcess.forEach(function (label) {
                    labelHighlights.forEach(function (labelHighlight) {
                        if (label.textContent.match(labelHighlight.regexp)) {
                            label.regexp = labelHighlight.regexp;
                            $(label).css(labelHighlight.style);
                        }
                    });
                });
            }
        }

     /* NOTES
      * there are two modes we need to care about: full-pass mode, in which there are no labels created
      * remember e is a text node, not necessarily an entire line
      * so we need to care what we're editing:
      *   - is it a label? then break it if it no longer respects the original regexp, and recreate it if it respects another regexp
      *   - is it a regular piece of text? then check for labels and create them all
      * also, if this piece of text has a cursor, we need to make sure we keep the cursor in the correct position
      */
    }

    function stylizeAll() {
        var table = contentDocument.querySelector('table.v'); 
        $(table).find('tr .d').each(function () {
            for (var i = 0; i < this.childNodes.length; i++) {
                stylizeByTextElement(this.childNodes[i]);
            }
        });
    }

    function handleChanges(summaries) {
        var interestingChanges = [].concat(summaries[0].added, summaries[0].valueChanged);
        
        interestingChanges.forEach(function (e) {
            stylizeByTextElement(e);
        });

        // Small fix for when nodes are moved around or cleared
        // Google Tasks doesn't seem to actually move nodes around... instead a series of add/remove operations are performed
        summaries[1].added.forEach(function (e, i, a) {
            if (e.textContent == '') {
                lineHighlights.forEach(function (lineHighlight) {
                    // clear any previous highlights
                    $(e.parentElement).closest('tr').find('td').removeClass(lineHighlight.className);
                });
            }
        });
    }

    stylizeAll();

    var table = contentDocument.querySelector('table.v'); 
    var observer = new MutationSummary({
        callback: handleChanges,
        rootNode: table.parentNode,
        queries: [
            { characterData: true },
            { element: '.d' }
        ]
    });
})();
