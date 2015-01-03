Template.duksIndex.rendered = function() {
};

Template.duksIndex.helpers({
  lastresult: function () {
    console.log("searching result");
    console.log(this);
    return Logs.findOne({ref_dukt: this._id}, {sort: {createdAt: -1}}).result; 
  },
});

Template.duksIndex.events ({
  'click .delete-duk': function(e) {
    e.preventDefault();
    var item = this;

    if (confirm("Are you sure?")) {
      Duks.remove(item._id);
      console.log("Deleted!")
    }
  }
});
