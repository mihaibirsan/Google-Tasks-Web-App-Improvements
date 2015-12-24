(function () {
    // wait until the table is set
    if (document.querySelector('iframe') == null
            || document.querySelector('iframe').contentDocument == undefined
            || document.querySelector('iframe').contentDocument.querySelector('table.v,table.z') == undefined) {
        return setTimeout(arguments.callee, 33);
    }

    var contentDocument = document.querySelector('iframe').contentDocument;

/** Filtering */
    $('head').append('<link rel="stylesheet" type="text/css" href="' + chrome.extension.getURL('google-tasks-improvements.css') + '" />');
    $('head').append('<link rel="stylesheet" type="text/css" href="' + chrome.extension.getURL('bower_components/select2/select2.css') + '" />');
    
    var $filterContainer = $('<div class="filter-container"></div>');
    var $filter = $('<input type="text" name="filter" />');
    $('.Sb', contentDocument).after($filterContainer);
    $('.gb .Tb', contentDocument).prepend($filterContainer);

    $filterContainer.append($filter);

    setTimeout(function () {
        var win = document.querySelector('iframe').contentWindow;
        win.dispatchEvent(new Event('resize', { view: win, bubbles: true, cancelable: true }));
    }, 333);

    var labels = [
    ];

    var updateLabels = function () {
        var all = [];
        $('tr.p:visible, tr.r:visible', contentDocument).each(function () {
            all.push( $(this).find('.d').text() );
        });
        all = all.join('\x0A');
        labels = _(labelHighlights)
            .chain()
            .collect(function (labelHighlight) {
                return all.match(new RegExp(labelHighlight.regexp.source, 'g'));
            })
            .flatten()
            .compact()
            .reduce(function (memo, item) {
                if (!memo[item]) {
                    memo[item] = {
                        label: item,
                        count: 1
                    };
                } else {
                    memo[item].count += 1;
                }
                return memo;
            }, {})
            .values()
            .sortBy('count')
            .reverse()
            .pluck('label')
            .value();
    }

    $filter
        .select2({
            multiple: true,
            query: function (query) {
                var data = {results: []};

                $.each(labels, function(){
                    if (query.term.length == 0 || this.toUpperCase().indexOf(query.term.toUpperCase()) >= 0) {
                        data.results.push({ id: this.toUpperCase(), text: this });
                    }
                });

                if (query.term.length > 0) {
                    data.results.push({ id: query.term.toUpperCase(), text: query.term });
                }

                query.callback(data);
            },
            width: '100%'
        })
        .on('select2-focus', function (event) {
            updateLabels();
        })
        .on('select2-blur', function (event) {
            // cleaning up...
            $('.select2-drop-mask', contentDocument).remove();
        })
        .on('change', function (event) {
            var val = event.val;

            if (val.length == 0) {
                $('tr.p, tr.r, tr.B', contentDocument).css('display', '');
                updateLabels();
                return;
            }

            function matching(text) {
                for (var i = 0; i < val.length; i++) {
                    if (text.toUpperCase().indexOf(val[i]) < 0) return false;
                }
                return true;
            }
            $('tr.p, tr.r', contentDocument).each(function () {
                $(this).toggle(matching($(this).find('.d').text()));
            });

            // hide empty groups
            $('tr.B', contentDocument).each(function () {
                var $c = $(this).next();
                while ($c.is('tr.p:hidden, tr.r:hidden')) $c = $c.next();
                var hasVisibleChildren = $c.is('tr.p:visible, tr.r:visible');
                $(this).toggle(hasVisibleChildren);
            });

            // 
            updateLabels();
        });

    $(contentDocument).keyup(function (event) {
        // Ctrl+/
        if (event.ctrlKey && event.keyCode == 191) {
            $filter.select2('open');
        }
    });

    // XXX: Filtering breaks up/down selection; maybe we should override

    // XXX: Do some profiling and improve code performance where possible


/** Prettifying */
    $('head', contentDocument).append('<link rel="stylesheet" type="text/css" href="' + chrome.extension.getURL('iframe.css') + '" />');
    $('head', contentDocument).append('<link rel="stylesheet" type="text/css" href="' + chrome.extension.getURL('bower_components/select2/select2.css') + '" />');
   
    var lineHighlights = [
        {
            regexp: /^→|^->/,
            className: 'arrow'
        },
        {
            regexp: /^⇨|^=>/,
            className: 'lesser-arrow'
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
            regexp: /\(~\)/,
            className: 'less-important'
        },
        {
            regexp: /★|\(*\)/,
            className: 'filled-star'
        },
        {
            regexp: /☆|\(o\)/,
            className: 'empty-star'
        }
    ];

    // TODO: Switch to stylesheet instead of inline styles
    var labelHighlights = [
        {
            // XXX: Google tasks seems to be adding a <wbr> tag after "/", which sometimes causes this label regex not to trigger...
            regexp: /\/!\\/,
            style: {
                display: 'inline-block',
                width: '3px',
                height: '0',
                borderColor: 'transparent transparent #F7BC21',
                borderWidth: '0 7px 13px',
                borderStyle: 'solid',
                borderRadius: '0 0 3px 3px',
                whiteSpace: 'nowrap',
                textIndent: '-4px',
                letterSpacing: '1px',
                fontSize: '10px',
                fontWeight: 'bold',
                verticalAlign: '-1px',
                color: 'white',
                textShadow: '1px 1px rgba(0, 0, 0, .33)',
                boxShadow: '0 1px rgba(0, 0, 0, .2)'
            }
        },
        {
            regexp: /\(x\)/,
            style: {
                display: 'inline-block',
                width: '16px',
                height: '15px',
                margin: '0 1px 0 0',
                background: '#F7214C',
                borderRadius: '10px',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                letterSpacing: '1px',
                fontSize: '10px',
                fontWeight: 'bold',
                verticalAlign: '1px',
                color: 'white',
                textShadow: '1px 1px rgba(0, 0, 0, .33)',
                boxShadow: '0 1px rgba(0, 0, 0, .2)'
            }
        },
        {
            regexp: /\(~\)/,
            style: {
                display: 'inline-block',
                width: '14px',
                height: '13px',
                margin: '0 1px 0 0',
                background: 'transparent',
                border: '2px solid #666',
                borderRadius: '10px',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                letterSpacing: '1px',
                fontSize: '10px',
                fontWeight: 'bold',
                verticalAlign: '1px',
                color: '#666',
                boxShadow: '0 1px rgba(0, 0, 0, .2)'
            }
        },
        /*
            element.style {
                background-color: #B3EFD3;
                color: #04A75B;
                padding: 0px 3px;
                border-radius: 3px;
                box-shadow: 1px 1px 1px rgba(0, 0, 0, .3);
            }
            element.style {
                background-color: red;
                color: white;
                font-weight: bold;
                padding: 0px 2px;
                border-radius: 3px;
            }
        */
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
            regexp: /\{\*.*\*\}/,
            style: {
                backgroundColor: 'rgba(0, 0, 0, .6)',
                color: 'white',
                borderRadius: '2px',
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
        },
        {
            regexp: /\{[^*\d].*\}/,
            style: {
                backgroundColor: '#FFD76E',
                color: '#333',
                fontSize: '9px',
                textTransform: 'uppercase',
                verticalAlign: 'bottom',
                border: '1px solid #E1BA53',
                borderRadius: '3px',
                padding: '0 2px'
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

        if (e.textContent.match(/~\*/)) e.textContent = e.textContent.replace(/~\*/, "\x0A");

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
        var table = contentDocument.querySelector('table.v,table.z'); 
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

    var table = contentDocument.querySelector('table.v,table.z'); 
    var observer = new MutationSummary({
        callback: handleChanges,
        rootNode: table.parentNode,
        queries: [
            { characterData: true },
            { element: '.d' }
        ]
    });

// Current Date

    function convertDate(date) {
        var days = "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(/ /);
        var months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(/ /);
        return days[date.getDay()] + ", " + months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
    }

    function markCurrentDate(summaries) {
        var today = convertDate(new Date());

        var interestingChanges = [].concat(summaries[0].added, summaries[0].valueChanged);
        
        interestingChanges.forEach(function (e) {
            if (e) {
                if ($(e).text() == today) {
                    $(e).parent().addClass('current-date');
                }
            }
        });
    }

    new MutationSummary({
        callback: markCurrentDate,
        rootNode: table.parentNode,
        queries: [
            { element: '.Y' }
        ]
    });


// Task Count
    var countElement = contentDocument.createElement('div');
    countElement.className = 'task-count';
    contentDocument.body.appendChild(countElement);

    function fullCount() {
        // XXX: This function is a performance mess; needs optimizing
        var totalCount = 0;
        var totalInFutureCount = 0;
        var totalInFilterCount = 0;
        var totalInFutureInFilterCount = 0;
        var $table = $(table);
        Array.prototype.forEach.call(contentDocument.querySelectorAll('tr.p .d, tr.r .d'), function (el, i, a) {
            if ((el.textContent == null || el.textContent.match(/^\s*$/)) && el.childNodes.length == 0) return;
            var $trp = $(el).closest('tr.p, tr.r');
            // inFilter
            var inFilter = $trp.is(':visible');

            // inFuture
            var inFuture = false;
            var dueDate;
            if ($trp.prevAll('tr.B').length > 0) {
                dueDate = $trp.prevAll('tr.B').eq(0).text();
            } else {
                dueDate = $trp.find('span.u.ab').text();
            }
            if (dueDate != '' && dueDate != 'No due date') {
                inFuture = moment(dueDate.replace(/^[^ ]+ /,'')).isAfter();
            }
            // if ($trp.find('span.u.ab').text())

            // count
            totalCount++;
            if (inFuture) totalInFutureCount++;
            if (inFilter) totalInFilterCount++;
            if (inFuture && inFilter) totalInFutureInFilterCount++;
        });

        function f(total, future) {
            if (future == 0) return ''+total;
            return (total-future) + '+' + future;
        }
        if (totalInFilterCount < totalCount) {
            countElement.textContent = 
                f(totalInFilterCount, totalInFutureInFilterCount)
                + ' of ' 
                + f(totalCount, totalInFutureCount);
        } else {
            countElement.textContent = f(totalCount, totalInFutureCount);
        }
    }

    new MutationSummary({
        callback: fullCount,
        rootNode: table.parentNode,
        queries: [
            { element: 'tr.p, tr.r', elementAttributes: 'style' }
        ]
    }); 

    new MutationSummary({
        callback: fullCount,
        rootNode: table.parentNode,
        queries: [
            { element: '.d', elementAttributes: 'class' }
        ]
    }); 

    fullCount();
})();
