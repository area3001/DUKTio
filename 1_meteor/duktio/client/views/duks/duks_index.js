Template.duksIndex.rendered = function() {
  var graph = new joint.dia.Graph;

  var paper = new joint.dia.Paper({
      el: $('#duktile'),
      width: 600,
      height: 200,
      model: graph,
      gridSize: 1
  });

  // Catch the delete and linking events 
  graph.on('remove', function(event, cell) {
      source_node = event.attributes.orig._id;
      target_node = event.attributes.orig.target;
      console.log("Removing link between " + source_node + " and " + target_node);
      Meteor.call("deleteEdge", {source: source_node, target: target_node}); 
  });
  
  // returns the name of the node from an edge
  function get_nodename_from_edge (edgename) {
    var re = new RegExp("^[a-zA-Z]+\.([a-zA-Z]+)\.(in|out)\.[0-9]+");
    var m = re.exec(edgename);
    if ((m) && (m[1])) {
      return m[1];
    } 
    return null;
  }

  // node factory method
  function new_node(dukt) {
    var new_node = new joint.shapes.basic.Rect({
        position: { x: 100, y: 30 },
        size: { width: 100, height: 30 },
        attrs: { rect: { fill: 'blue' }, text: { text: dukt.name, fill: 'white' }}
    });
    new_node.prop({orig: dukt});
    new_node.id = "graph_node_" + dukt.name;
    return new_node;
  };

  // node factory method
  function new_links(edge) {
    var edge_source = get_nodename_from_edge(edge._id);
    var link_source_node = Duks.findOne({name: edge_source});

    var links = []; 
    edge.endpoints.forEach(
      function(element, index){
        var edge_target = get_nodename_from_edge(element._id);
        if (edge_target) {
          var link_target_node = Duks.findOne({name: edge_target});
          var link = new joint.dia.Link({
            source: { id: "graph_node_" + edge_source},
            target: { id: "graph_node_" + edge_target}
          });
          link.prop({orig: {_id: edge._id, target: element._id}});
          links.push(link);
        };
      }
    );
    return links;
  };

  // observe the reactive datasource to add nodes and links to the graph
  Duks.find().observe({
      added: function (doc) {
        console.log("Observed node addition");
        var node = new_node(doc);
        graph.addCells([node]);
      },
      removed: function (doc) {
        console.log("Observed node removal");
        graph.getCell("graph_node_" + doc.name).remove();
      }
    });

  Edges.find().observe({
      added: function (doc) {
        console.log("Added links for a source port");
        var links = new_links(doc);
        graph.addCells(links);
      },
      removed: function (doc) {
        // graph.removeNode(doc._id);
        console.log("Observed a link removal");
      }
    });

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
