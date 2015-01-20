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

  joint.shapes.html = {};
  joint.shapes.html.Basicnode = joint.shapes.devs.Model.extend({
      defaults: joint.util.deepSupplement({
          position: { x: 50, y: 50 },
          size: { width: 90, height: 50 },
          // inPorts: ['in1','in2'],
          // outPorts: ['out1'],
          attrs: {
              '.label': { text: "placeholder", //'ref-x': .4, 'ref-y': .2, 
                          fill: 'white', 'font-weight': 'lighter', 'font-size': 24 },  //text: { text: dukt.name, fill: 'white'}, // 'ref-x': .4, 'ref-y': .2 },
              rect: { fill: '#337ab7', rx: 10, ry: 10 },
              '.inPorts circle': { fill: '#16A085', magnet: 'passive', type: 'input' },
              '.outPorts circle': { fill: '#E74C3C', type: 'output' },
              '.delete-node-circle': { fill: 'red', graph_node_id: "placeholder"},
          }
      }, joint.shapes.devs.Model.prototype.defaults)
  });

  // Catch the delete and linking events 
  // graph.on('all', function(event, cell) {
  //     console.log("event:");
  //     console.log(arguments);
  // });

  // attach jquery event handlers when cells are added to the graph
  graph.on('add', function(cell) {
      // display soem elements on hovering over a node
      $(".element.devs.Model").hover(function(event){
          $(".set_visible_on_hover").hide();
          $(this).find(".set_visible_on_hover").show();
      })
      // Attach to node delete button
      $(".delete-node-circle").unbind();  // removing previous click event handlers
      $(".delete-node-circle").click(function(event){
          console.log("Trigger delete of: " + $(this).attr('graph_node_id'));
      });

      ////////////////
      // JUST TESTING SOMETHING HERE< DO NOT KEEP THIS
      // $(".delete-node-circle").magnificPopup({
      //     type:'inline',
      //     midClick: true // Allow opening popup on middle mouse click. Always set it to true if you don't provide alternative source in href.
      // });
      ////////////////

  });

  // Debounced version of the Meteor call function
  var lazyMeteorCall = _.debounce(Meteor.call, 300);

  // Catch the delete and linking events 
  graph.on('change', function(event, cell) {
      if (event.id.indexOf("graph_node_" == 0)) {

        // Graph node changed, need to store it
        db_node = {_id: event.attributes.orig.db_orig._id , graph: {position: event.attributes.position, z: event.attributes.z}};
        lazyMeteorCall("saveDuk", db_node);
      }
  });

  // Catch the delete and linking events 
  graph.on('remove', function(event, cell) {
      source_node = event.attributes.orig._id;
      target_node = event.attributes.orig.target;
      console.log("Removing link between " + source_node + " and " + target_node);
      // Meteor.call("deleteEdge", {source: source_node, target: target_node}); 
  });
  
  graph.on('change:source change:target', function(link) {
      // link change triggers constantly, so wait for the user to release the mouse button
      if (mouseDown) return;

      var sourcePort = link.get('source').port;
      var sourceId = link.get('source').id;
      var targetPort = link.get('target').port;
      var targetId = link.get('target').id;

      // HERE -- Store all link to the DB

      if (!(sourcePort && sourceId && targetPort && targetId)) {
        // if source or target port are undefined, snap it back to the previous position
        console.log("Resetting link");
        link.set('source').id = link.get('prev_link_source').id;
        link.set('source').port = link.get('prev_link_source').port;
        link.set('target').id = link.get('prev_link_target').id;
        link.set('target').port = link.get('prev_link_target').port;
      } else {
        // if source and target port are defined, delete the previous link from the DB, and add the new one
        // Meteor.call("deleteEdge", {source: source_node, target: target_node});
        // Meteor.call("deleteEdge", {source: source_node, target: target_node});
      }


      // var m = [
      //     'The port <b>' + sourcePort,
      //     '</b> of element with ID <b>' + sourceId,
      //     '</b> is connected to port <b>' + targetPort,
      //     '</b> of elemnt with ID <b>' + targetId + '</b>'
      // ].join('');
      // console.log(m);
      console.log(link);
      
  });

  // node factory function
  function create_node(db_node) {
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

    return node;
  }

  // link factory function
  function create_port(full_name) {
    var port = {};
    var re = new RegExp("^[a-zA-Z_]*[|]?([a-zA-Z_]+)\.([a-zA-Z_]+)\.(in|out)\.([0-9]+)");

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

    return (port.get_parts() ? port : null);
  };

  // node factory method
  function new_graph_node(node) {
    var new_node = new joint.shapes.html.Basicnode({
        position: node.get_position(),
        z: node.get_z(),
        size: { width: 90, height: 50 },
        attrs: {
            'text': { text: node.get_name(), fill: 'white', 'font-weight': 'lighter', 'font-size': 24},
             '.delete-node-circle': { fill: 'red', graph_node_id: node.get_graph_name()}
        },
        inPorts: node.get_input_ports() || [],
        outPorts: node.get_output_ports() || [],
    });

    if (node.get_pathname()) {
      new_node.attr('rect/fill', '#559ce9');
      new_node.attr('text/fill', 'white');
    }

    new_node.prop({orig: node});
    new_node.id = node.get_graph_name();

    return new_node;
  };

  // link factory method
  function new_links(db_edge) {
    var edge_source = create_port(db_edge._id);
    if (edge_source === null) return [];    
    var link_source_node = Duks.findOne({name: edge_source.get_name()});

    var links = []; 
    db_edge.endpoints.forEach(
      function(element, index){
        var edge_target = create_port(element._id);
        if ((edge_target) && (edge_target.get_name()) && (edge_target.get_name().length)) {
          var link_target_node = Duks.findOne({name: edge_target.get_name()});
          console.log("graph_node_" + edge_source.get_name() + " port: " + edge_source.get_graph_short_name());
          var link = new joint.dia.Link({
            source: { id: "graph_node_" + edge_source.get_name(), port: edge_source.get_graph_short_name()},
            target: { id: "graph_node_" + edge_target.get_name(), port: edge_target.get_graph_short_name()}
          });
          link.prop({orig: {id: edge_source.get_full(), target: edge_target.get_name()},       // orig data from DB
                     prev_link_source: { id: "graph_node_" + edge_source.get_name()},   // previous link data
                     prev_link_target: { id: "graph_node_" + edge_target.get_name()}
                   });
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
        var new_node = create_node(doc);
        var graph_node = new_graph_node(new_node);
        graph.addCells([graph_node]);
      },
      removed: function (doc) {
        console.log("###");console.log("Observed node removal: ");console.log("graph_node_" + doc.name);console.log("^^^");
        if (doc) graph.getCell("graph_node_" + doc.name).remove();
      }
    });

  Edges.find().observe({
      added: function (db_edge) {
        console.log("Added links for a source port");
        var links = new_links(db_edge);
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

Template.duksIndex.events ({
  'click .add-duk': function(e) {
    e.preventDefault();
    var new_title = "new_duk";
    
    if (Duks.findOne({"name": new_title})) {
      Notifications.info('Could not create new Duk', 'Duk with name "' + new_title + '" already exists. Better rename the existing one first.');
    }
    else {
      Meteor.call("addEmptyDuk", new_title);
    }
  }
});
