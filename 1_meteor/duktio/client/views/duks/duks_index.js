Template.duksIndex.rendered = function() {
  var graph = new joint.dia.Graph;

  var paper = new joint.dia.Paper({
      el: $('#duktile'),
      width: 600,
      height: 200,
      model: graph,
      gridSize: 1
  });

  function new_node(dukt_name) {
    return new joint.shapes.basic.Rect({
        position: { x: 100, y: 30 },
        size: { width: 100, height: 30 },
        attrs: { rect: { fill: 'blue' }, text: { text: dukt_name, fill: 'white' } }
    });
  };

  // Add all dukt nodes individually
  // TODO: Better just loop over the collection
  this.$(".dukt_in_overview .dukt_name a").each(function(index) {
    var node = new_node($(this).text());
    graph.addCells([node]);
  })

  // Add all links (edges)
  // TODO: Better just loop over the collection

  // var link = new joint.dia.Link({
  //     source: { id: rect.id },
  //     target: { id: rect2.id }
  // });

  // Layout

  // Event: Open Editor

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
