var express = require('express');
var router = express.Router();


router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
/* GET users listing.
<!DOCTYPE html>
<html>
  <head>
    <%- include('./partials/head'); -%>
  </head>
  <body>
    <header>
      <%- include('./partials/header.ejs'); -%>
    </header>
    <% if (user) {%>
      <h1>WELCOME BACK <%= user.username %></h1>
      <a href="/log-out">LOG OUT</a>
    <% } else { %>
      <h1>please log in</h1>
      <form action="/log-in" method="POST">
        <label for="username">Username</label>
        <input name="username" placeholder="username" type="text" />
        <label for="password">Password</label>
        <input name="password" type="password" />
        <button class="btn btn-primary">Log In</button>
      </form>
    <%}%>
    <footer>
      <%- include('./partials/footer.ejs'); -%>
    </footer>
  </body>
</html> */