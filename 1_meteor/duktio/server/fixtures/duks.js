// Fixture data
if (Duks.find().count() === 0) {

  Duks.insert({
    name: "Your first duk",
    subdomain: "example-123456",
    path: "greeting/hello",
    code: 'return "Hello, World!"'
  });

}
