
//////////////////////////////////////////////////////////////////////////////////
// GLOBALS
//////////////////////////////////////////////////////////////////////////////////
var graph = {}

//////////////////////////////////////////////////////////////////////////////////
// Some helpers
//////////////////////////////////////////////////////////////////////////////////

// Debounced version of the Meteor call function
var lazyMeteorCall = _.debounce(Meteor.call, 300);

////
// Internal functions
////

// node factory function
function create_node(db_node) {
  console.log("> In create_node");
  var node = {};
  var graph_prefix = "graph_node_";

  node.db_orig = db_node;

  node.name = db_node.name;
  node.subdomain = db_node.subdomain;
  node.pathname = db_node.pathname;
  node.input_ports = db_node.input_ports;
  node.output_ports = db_node.output_ports;
  if ((db_node) && (db_node.graph)) {
    node.position = db_node.graph.position;
    node.z = db_node.graph.z;
  }

  node.get_name = function() {
    return this.name;
  };
  
  node.get_graph_name = function() {
    return graph_prefix + this.name;
  };

  node.get_subdomain = function() {
    return this.subdomain;
  };

  node.get_input_ports = function() {
    return this.input_ports;
  };

  node.get_output_ports = function() {
    return this.output_ports;
  };

  node.get_position = function() {
    return this.position;
  };

  node.get_z = function() {
    return this.z;
  };

  node.get_pathname = function() {
    return this.pathname;
  };

  console.log("< Out create_node");
  return node;
}

// new_graph_node
function new_graph_node(node) {
  console.log("> In new_graph_node");
  var new_node = new joint.shapes.html.Basicnode({
      position: node.get_position(),
      z: node.get_z(),
      size: { width: 90, height: 50 },
      attrs: {
          'text': { text: node.get_name(), fill: 'white', 'font-size': 14},    // See external ccs to overwrite bootstrap external css
          '.delete-node-circle': { fill: 'red', graph_node_id: node.get_graph_name()},
          '.port-label': {fill: 'black', 'font-size': 16, dy: "-7"}, 
      },
      inPorts: node.get_input_ports() || [],
      outPorts: node.get_output_ports() || [],
  });
  console.log("Input ports:")
  console.log(new_node.attributes.inPorts);

  if (node.get_pathname()) {
    new_node.attr('rect/fill', '#559ce9');
    new_node.attr('text/fill', 'white');
    new_node.set('inPorts', [node.get_pathname()]);
    new_node.attr('.inPorts circle', { fill: 'black', type: 'no-input' });
  }

  new_node.prop({orig: node});
  new_node.id = node.get_graph_name();

  console.log("< Out new_graph_node");
  return new_node;
};

// link factory function
function create_port(full_name) {
  console.log("> In create_port: ");console.log(arguments);

  var port = {};
  var re = new RegExp("^([a-zA-Z_]+)\.([a-zA-Z0-9_]+)\.(in|out)\.([a-zA-Z0-9_]+)");

  full_name = full_name.split("|", 2);
  if (full_name.length === 2) {
    full_name = full_name[1];
  } else {
    full_name = full_name[0];
  }

  port.full = full_name;
  
  port.get_parts = function() {
    var m = re.exec(this.full);
    if ((m) && (m[0]) && (m[1]) && (m[2]) && (m[3])) {
      return [m[1], m[2], m[3], m[4]];
    }
    return null;
  };

  port.get_full = function() {
    return this.full;
  };

  port.get_subdomain = function() {
    return this.get_parts()[0];
  };

  port.get_name = function() {
    console.log(this.full);
    return this.get_parts()[1];
  };

  port.get_direction = function() {
    return this.get_parts()[2];
  };

  port.get_port = function() {
    return this.get_parts()[3];
  };

  port.get_graph_short_name = function() {
    return this.get_direction() + this.get_port();
  };

  port.nodeExists = function() {
    if (this.get_direction == 'in') {
      return Duks.findOne({name: this.get_name(), input_ports: this.get_port()})
    }
    else if (this.get_direction == 'out') {
      return Duks.findOne({name: this.get_name(), output_ports: this.get_port()})
    }
    return null;
  };

  console.log("Out create_port: ");console.log(port);
  return (port.get_parts() ? port : null);
};

// link factory method
function new_links(db_edge) {
  console.log("> In new links: ");console.log(arguments);
  var edge_source = create_port(db_edge._id);
  if (edge_source === null) return [];
  console.log(edge_source.get_name());
  // if ((edge_source.nodeExists() === null)) {
  //   // the port for the endpoint cannot be found in the node list
  //   // hence delete the complete edge
  //   console.log('deleting edge since I cannot find the source connection')
  //   console.log(db_edge);
  //   Meteor.call('deleteAllEdgesforaSource', {source: db_edge._id});
  // }
  var link_source_node = Duks.findOne({name: edge_source.get_name()});

  var links = []; 
  db_edge.endpoints.forEach(
    function(element, index){
      var edge_target = create_port(element);
      if ((edge_target) && (edge_target.get_name()) && (edge_target.get_name().length)) {
        var link_target_node = Duks.findOne({name: edge_target.get_name()});
        var link = new joint.dia.Link({
          source: { id: "graph_node_" + edge_source.get_name(), port: edge_source.get_port()},
          target: { id: "graph_node_" + edge_target.get_name(), port: edge_target.get_port()}
        });
        link.prop({orig: {id: edge_source.get_full(), target: edge_target.get_name()},       // orig data from DB
                   prev_link_source: { id: "graph_node_" + edge_source.get_name()},   // previous link data
                   prev_link_target: { id: "graph_node_" + edge_target.get_name()}
                 });
        links.push(link);
      };
    }
  );
  console.log("< Out new links: ");console.log(links);
  return links;
};

function load_graph () {
  console.log("> In load graph");
  // do the load for each node
  var cursor = Duks.find();
  cursor.forEach(function (row) {
      var graph_node = new_graph_node(create_node(row));
      console.log(graph_node);
      graph.addCells([graph_node]);
  }); 

  // do the load for each link
  var cursor = Edges.find();
  cursor.forEach(function (row) {
      var links = new_links(row);
      graph.addCells(links);
  });
  console.log("< Out load graph");
};

function reload_graph () {
  graph.clear();
  load_graph();
};


//////////////////////////////////////////////////////////////////////////////////
// On iron router rendering 
//////////////////////////////////////////////////////////////////////////////////

Template.duksIndex.rendered = function() {

  // Need this to know whether mouse is up or down in event handling
  var mouseDown = 0;
  document.body.onmousedown = function() {mouseDown = 1; } 
  document.body.onmouseup = function() {mouseDown = 0; }

  //////////////////////////////////////////////////////////////////////////////////
  // Jointjs 
  //////////////////////////////////////////////////////////////////////////////////

  // Setting up the jointjs graph and paper
  graph = new joint.dia.Graph;

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

  // Defining a jointjs cell for the nodes
  joint.shapes.html = {};
  joint.shapes.html.Basicnode = joint.shapes.devs.Model.extend({
      defaults: joint.util.deepSupplement({
          position: { x: 50, y: 50 },
          size: { width: 90, height: 50 },
          // inPorts: ['in1','in2'],
          // outPorts: ['out1'],
          attrs: {
              '.label': { text: "placeholder", //'ref-x': .4, 'ref-y': .2, 
                          fill: 'white'},  //text: { text: dukt.name, fill: 'white'}, // 'ref-x': .4, 'ref-y': .2 },
              rect: { fill: '#337ab7', rx: 10, ry: 10 },
              '.inPorts circle': { fill: '#16A085', magnet: 'passive', type: 'input' },
              '.outPorts circle': { fill: '#E74C3C', type: 'output' },
              '.delete-node-circle': { fill: 'red', graph_node_id: "placeholder"},
          }
      }, joint.shapes.devs.Model.prototype.defaults)
  });

  //////////////////////////////////////////////////////////////////////////////////
  // Jointjs event handling
  //////////////////////////////////////////////////////////////////////////////////
 
  // Catch the delete and linking events 
  // graph.on('all', function(event, cell) {
  //     console.log("event:");
  //     console.log(arguments);
  // });

  // attach jquery event handlers when cells are added to the graph
  graph.on('add', function(cell) {
      console.log("> In graph.on add");
      // display some elements on hovering over a node
      $(".element.devs.Model").hover(function(event){
          $(".set_visible_on_hover").hide();
          $(this).find(".set_visible_on_hover").show();
      })
      // Attach to node delete button
      $(".delete-node-circle").unbind();  // removing previous click event handlers
      $(".delete-node-circle").click(function(event){
          // console.log("Trigger delete of: " + $(this).attr('graph_node_id'));
      });

      ////////////////
      // JUST TESTING SOMETHING HERE< DO NOT KEEP THIS
      // $(".delete-node-circle").magnificPopup({
      //     type:'inline',
      //     midClick: true // Allow opening popup on middle mouse click. Always set it to true if you don't provide alternative source in href.
      // });
      ////////////////

      console.log("< Out graph.on add");
  });

  load_graph();


  // // Catch the delete and linking events 
  // graph.on('change', function(event, cell) {
  //     console.log("> In graph.on changed");
  //     if ((event.attributes) && (event.attributes.type !== 'link') && 
  //         (event.id) && (event.id.indexOf("graph_node_" == 0))) {
  //       // Graph node changed, need to store it
  //       console.log(". Graph nodes changed");
  //       db_node = {_id: event.attributes.orig.db_orig._id, graph: {position: event.attributes.position, z: event.attributes.z}};
  //       console.log(".. calling Meteor.saveDuk");
  //       console.log(db_node);
  //       lazyMeteorCall("saveDuk", db_node);
  //     }
  //     if ((event.attributes) && (event.attributes.type == 'link') &&
  //         (event.attributes.source) && (event.attributes.source.port) &&
  //         (event.attributes.target) && (event.attributes.target.port)) {
  //       console.log(". Graph links changed");
  //       var subdomain = Meteor.user().profile.subdomain;
  //       var link_from = subdomain + "." + event.attributes.source.id.substring('graph_node_'.length) + ".out." + event.attributes.source.port;
  //       var link_to = subdomain + "." + event.attributes.target.id.substring('graph_node_'.length) + ".in." + event.attributes.target.port;
  //       var link = {source: link_from, target: link_to};
  //       //if the id doesn't start with your subdomain than add a new link
  //       if (event.id.lastIndexOf(subdomain, 0) !== 0) {
  //         console.log(".. calling Meteor.addEdge");
  //         lazyMeteorCall("addEdge", link);
  //         event.remove();
  //       } else {
  //         console.log(".. calling Meteor.saveEdge");
  //         lazyMeteorCall("saveEdge", link);
  //       }
  //     }
  //     console.log("< Out graph.on changed");
  // });

  // // Catch the delete and linking events 
  // graph.on('remove', function(event, cell) {
  //     console.log("> In graph.on removed");
  //     var subdomain = Meteor.user().profile.subdomain;
  //     var link_from = subdomain + "." + event.attributes.source.id.substring('graph_node_'.length) + ".out." + event.attributes.source.port;
  //     var link_to = subdomain + "." + event.attributes.target.id.substring('graph_node_'.length) + ".in." + event.attributes.target.port;
  //     // Watch it: triggers to much
  //     Meteor.call("deleteEdge", {source: link_from, target: link_to}); 
  //     console.log("< Out graph.on removed");
  // });
  
  // graph.on('change:source change:target', function(link) {
  //     // link change triggers constantly, so wait for the user to release the mouse button
  //     if (mouseDown) return;

  //     var sourcePort = link.get('source').port;
  //     var sourceId = link.get('source').id;
  //     var targetPort = link.get('target').port;
  //     var targetId = link.get('target').id;

  //     // HERE -- Store all link to the DB

  //     if (!(sourcePort && sourceId && targetPort && targetId)) {
  //       // if source or target port are undefined, snap it back to the previous position
  //       console.log("Resetting link");
  //       link.set('source').id = link.get('prev_link_source').id;
  //       link.set('source').port = link.get('prev_link_source').port;
  //       link.set('target').id = link.get('prev_link_target').id;
  //       link.set('target').port = link.get('prev_link_target').port;
  //     } else {
  //       // if source and target port are defined, delete the previous link from the DB, and add the new one
  //       // Meteor.call("deleteEdge", {source: source_node, target: target_node});
  //       // Meteor.call("deleteEdge", {source: source_node, target: target_node});
  //     }


  //     // var m = [
  //     //     'The port <b>' + sourcePort,
  //     //     '</b> of element with ID <b>' + sourceId,
  //     //     '</b> is connected to port <b>' + targetPort,
  //     //     '</b> of elemnt with ID <b>' + targetId + '</b>'
  //     // ].join('');
  //     // console.log(m);
  //     console.log(link);
      
  // });

  //////////////////////////////////////////////////////////////////////////////////
  // DB event handling
  //////////////////////////////////////////////////////////////////////////////////

  // observe the reactive datasource to add nodes and links to the graph
  duks_observe_handle = Duks.find().observe({
      added: function (doc) {
        console.log("> In duks.find observe.added");
      //   var new_node = create_node(doc);
      //   var graph_node = new_graph_node(new_node);
      //   graph.addCells([graph_node]);
        // load_graph();
        console.log("< Out duks.find observe.added");
      },
      removed: function (doc) {
        console.log("> In duks.find observe.removed");
      //   if (doc) graph.getCell("graph_node_" + doc.name).remove();
        // reload_graph();
        console.log("< Out duks.find observe.removed");
      }
    });

  edges_observe_handle = Edges.find().observe({
      
      // source was added 
      // added: function (db_edge) { 
      //   console.log("> In edges.find observe.added");
      //   var links = new_links(db_edge);
      //   console.log("< Out edges.find observe.added");
      //   graph.addCells(links);
      // },
      // // a target was added or removed in an existing source endpoint
      // changed: function (id, fields) { 
      //   console.log("> In edges.find observe.changed");
      //   added_link = _.difference(id.endpoints, fields.endpoints);
      //   if (added_link) {
      //     var links = new_links({_id: id._id, endpoints: added_link});
      //     graph.addCells(links);
      //   }
      //   console.log("< Out edges.find observe.changed");
      // },
      // removed: function (doc) {
      //   // graph.removeNode(doc._id);
      //   console.log("> In edges.find observe.removed");
      //   console.log("< Out edges.find observe.removed");
      // }
    });

  // Layout

  // Event: Open Editor

};

//////////////////////////////////////////////////////////////////////////////////
// Meteor data for templates
//////////////////////////////////////////////////////////////////////////////////

Template.duksIndex.helpers({
  lastresult: function () {
    console.log("> In template.helpers lastresult");
    console.log(this);
    node = Logs.findOne({ref_dukt: this._id}, {sort: {createdAt: -1}});
    if (node) {
      return node.result; 
    } else {
      return "";
    }
    console.log("< Out template.helpers lastresult");
  },
});

//////////////////////////////////////////////////////////////////////////////////
// Meteor events for templates
//////////////////////////////////////////////////////////////////////////////////

Template.duksIndex.events ({
  'click .delete-duk': function(e) {
    console.log("> In template.events click delete-duk");
    e.preventDefault();
    var item = this;

    if (confirm("Are you sure?")) {
      Duks.remove(item._id);
      // Meteor.call("saveGraphToServer", graph.toJSON().cells);
      reload_graph();
    }
    console.log("< Out template.events click delete-duk");
  },
  'click .add-duk': function(e) {
    console.log("> In template.events click add-duk");
    e.preventDefault();
    var new_title = "new_duk";
    
    if (Duks.findOne({"name": new_title})) {
      Notifications.info('Could not create new Duk', 'Duk with name "' + new_title + '" already exists. Better rename the existing one first.');
    }
    else {
      Meteor.call("addEmptyDuk", new_title);
      // Meteor.call("saveGraphToServer", graph.toJSON().cells);
      reload_graph();
    }
    console.log("< Out template.events click add-duk");
  },
  'click .save-graph': function(e) {
    console.log("> In template.events click save-graph");
    e.preventDefault();
    lazyMeteorCall("saveGraphToServer", graph.toJSON().cells);
    console.log("< Out template.events click save-graph");
  },
  'click .load-graph': function(e) {
    console.log("> In template.events click load-graph");
    e.preventDefault();

    reload_graph();

    console.log("< Out template.events click load-graph");
  } 
});
