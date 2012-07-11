(function () {
    // wait until the table is set
    if (document.querySelector('iframe') == null
            || document.querySelector('iframe').contentDocument == undefined
            || document.querySelector('iframe').contentDocument.querySelector('table.v') == undefined) {
        return setTimeout(arguments.callee, 33);
    }

    function stylizeByTextElement(e) {
        if (e == undefined || e.data == undefined) return;

        // TODO: when completely deleting a node or moving a node onto a blank node the styles don't go away (code doesn't reach this)
        // TODO: Make these into configurable values
        // TODO: Switch to stylesheet instead of inline styles
        if (e.data.match(/★/)) {
            $(e.parentElement).closest('tr').find('td').css({ backgroundColor: '#BCDEFF' });
        }
        else if (e.data.match(/☆/)) {
            $(e.parentElement).closest('tr').find('td').css({ backgroundColor: '#DEEEFF' });
        }
        else if (e.data.match(/\/!\\/)) {
            $(e.parentElement).closest('tr').find('td').css({ backgroundColor: '#FFFABC' });
        }
        else if (e.data.match(/\(x\)/)) {
            $(e.parentElement).closest('tr').find('td').css({ backgroundColor: '#FFBCBC' });
        }
        else if (e.data.match(/→/)) {
            $(e.parentElement).closest('tr').find('td').css({ backgroundColor: '#FFCC00' });
        }
        else {
            $(e.parentElement).closest('tr').find('td').css({ backgroundColor: '' });
        }

     /*
        // TODO: take care of cursor placement and the destruction of the label once it's no longer good
        var label = '[further]';
        if ($(e.parentElement).is('div.d') && e.data.indexOf(label) > -1) {
            // TODO: Save selection, if selection is in this node
            var range = window.getSelection().getRangeAt(0);
            var fragment = range.createContextualFragment('<span class="label" style="background:red;color:white;">[further]</span>');
            range.insertNode(fragment);
            e.data = e.data.replace
        }
    */
    }

    function stylizeAll() {
        var table = document.querySelector('iframe').contentDocument.querySelector('table.v'); 
        $(table).find('tr .d').each(function () {
            stylizeByTextElement(this.childNodes[0]);
        });
    }

    function handleChanges(summaries) {
        var interestingChanges = [].concat(summaries[0].added, summaries[0].valueChanged);
        
        // TODO: This method is flawed; this extension should operate at the cursor level better
        if (interestingChanges.length == 1) stylizeByTextElement(interestingChanges[0]);
        else if (interestingChanges.length > 1) stylizeAll();

        // Small fix for when nodes are moved around or cleared
        // Google Tasks doesn't seem to actually move nodes around... instead a series of add/remove operations are performed
        summaries[1].added.forEach(function (e, i, a) {
            if (e.textContent == '')
                $(e).closest('tr').find('td').css({ backgroundColor: '' });
        });
    }

    stylizeAll();

    var table = document.querySelector('iframe').contentDocument.querySelector('table.v'); 
    var observer = new MutationSummary({
        callback: handleChanges,
        rootNode: table.parentNode,
        queries: [
            { characterData: true },
            { element: '.d' }
        ]
    });
})();
