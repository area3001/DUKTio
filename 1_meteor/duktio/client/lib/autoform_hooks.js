// Autoform hooks

AutoForm.addHooks(['dukForm', "dukNew"], {
  after: {
    update: function(error) {
      console.log("In autoform Hook after update");
      if (error) {
        console.log("Update Error:", error);
      } else {
        console.log("Updated!");
        Router.go('duksIndex')
      }
    },
    insert: function(error, result) {
      console.log("In autoform Hook after insert");
      if (error) {
        console.log("Insert Error:", error);
      } else {
        console.log("Insert Result:", result);
        Router.go('duksIndex')
      }
    }
  }
});

