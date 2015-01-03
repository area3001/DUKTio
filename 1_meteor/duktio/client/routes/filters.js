// Iron-router filters / hooks that will run on certain routes

var filters = {

  resetDukForm: function() {
    AutoForm.resetForm('dukForm')
  }

}

Router.onStop(filters.resetDukForm, {only: ['dukNew', 'dukEdit']});
