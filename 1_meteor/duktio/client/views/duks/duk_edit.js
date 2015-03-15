AutoForm.hooks({
  dukEdit: {
    after: {
      "saveDuk": function (doc) {
        Router.go('duksIndex');
      }
    }
  }
});

Template.dukEdit.rendered = function() {
};

Template.dukEdit.helpers({
});

Template.dukEdit.events ({
});
