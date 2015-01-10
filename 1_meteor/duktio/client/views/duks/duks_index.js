Template.duksIndex.rendered = function() {

  var mouseDown = 0;
  document.body.onmousedown = function() { 
    mouseDown = 1;
  }
  document.body.onmouseup = function() {
    mouseDown = 0;
  }

  var graph = new joint.dia.Graph;

  var paper = new joint.dia.Paper({
      el: $('#duktile'),
      width: "100%", height: 350, gridSize: 1,
      model: graph,
      defaultLink: new joint.dia.Link({
          attrs: { '.marker-target': { d: 'M 10 0 L 0 5 L 10 10 z' } }
      }),
      validateConnection: function(cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
          // Prevent linking from input ports.
          if (magnetS && magnetS.getAttribute('type') === 'input') return false;
          // Prevent linking from output ports to input ports within one element.
          if (cellViewS === cellViewT) return false;
          // Prevent linking to input ports.
          return magnetT && magnetT.getAttribute('type') === 'input';
      },
      // Enable marking available cells & magnets
      markAvailable: true
  });

  // Catch the delete and linking events 
  graph.on('remove', function(event, cell) {
      source_node = event.attributes.orig._id;
      target_node = event.attributes.orig.target;
      console.log("Removing link between " + source_node + " and " + target_node);
      Meteor.call("deleteEdge", {source: source_node, target: target_node}); 
  });
  
  graph.on('change:source change:target', function(link) {
      // link change triggers constantly, so wait for the user to release the mouse button
      if (mouseDown) return;

      var sourcePort = link.get('source').port;
      var sourceId = link.get('source').id;
      var targetPort = link.get('target').port;
      var targetId = link.get('target').id;

      // HERE -- Store all link to the DB

      // if source or target port are undefined, snap it back to the previous position
      // if source and target port are defined, delete the previous link and add the new one

      // var m = [
      //     'The port <b>' + sourcePort,
      //     '</b> of element with ID <b>' + sourceId,
      //     '</b> is connected to port <b>' + targetPort,
      //     '</b> of elemnt with ID <b>' + targetId + '</b>'
      // ].join('');
      // console.log(m);
      // console.log(link);
      
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
    // Make arrays for the input and output ports 
    console.log(dukt.name);
    var new_node = new joint.shapes.devs.Model({
        position: { x: 50, y: 50 },
        size: { width: 90, height: 50 },
        //attrs: { rect: { fill: 'blue' }, text: { text: dukt.name, fill: 'white' }},
        inPorts: ['in1','in2'],
        outPorts: ['out'],
        attrs: {
            '.label': { text: dukt.name, //'ref-x': .4, 'ref-y': .2, 
                        fill: 'white', 'font-weight': 'lighter', 'font-size': 14 },  //text: { text: dukt.name, fill: 'white'}, // 'ref-x': .4, 'ref-y': .2 },
            rect: { fill: '#337ab7', rx: 10, ry: 10 },
            '.inPorts circle': { fill: '#16A085', r: 6, magnet: 'passive', type: 'input' },
            '.outPorts circle': { fill: '#E74C3C', r: 6, type: 'output' }
        }
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
        console.log("###");console.log("Observed node removal: ");console.log(doc);console.log("^^^");
        if (doc) graph.getCell("graph_node_" + doc.name).remove();
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
    node = Logs.findOne({ref_dukt: this._id}, {sort: {createdAt: -1}});
    if (node) {
      return node.result; 
    } else {
      return "";
    }
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
