const express = require('express');
const app = express();
const port = 3000 ; 
const path = require('path'); 
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static(path.join(__dirname, 'public')));
const {Pool } = require (`pg`); 

//pg 
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'dashboard',
  password: process.env.PGPASSWORD || 'supersecretpassword that i just made up frfr. ',
  port: process.env.PGPORT || 5432,
});

 
const PAGE_SIZE = 10;

app.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * PAGE_SIZE;

    const [
      customerCount,   // 1
      customers,       // 2
      revenue,         // 3
      sales,           // 4
      orderCount,      // 5
      issuesCount,     // 6
      issues,          // 7
      notifCount,      // 8
      notifications,   // 9
      tasks,           // 10
    ] = await Promise.all([
      pool.query('SELECT count(*) FROM customers'),
      pool.query('SELECT * FROM customers ORDER BY id LIMIT $1 OFFSET $2', [PAGE_SIZE, offset]),
      pool.query('SELECT sum(saleamount) FROM sales'),
      pool.query(`SELECT products.name, sales.quantity, sales.saleamount
                  FROM sales
                  LEFT JOIN products ON sales.productid = products.id
                  ORDER BY sales.id ASC`),
      pool.query('SELECT count(quantity) FROM orders'),
      pool.query("SELECT count(id) FROM alerts WHERE type = 'issues'"),
      pool.query("SELECT * FROM alerts WHERE type = 'issues'"),
      pool.query("SELECT count(id) FROM alerts WHERE type = 'notifications'"),
      pool.query("SELECT * FROM alerts WHERE type = 'notifications'"),
      pool.query("SELECT * FROM alerts WHERE type = 'tasks'"),
    ]);

    // pg returns count()/sum() results as strings, so convert them
    const totalCustomers = Number(customerCount.rows[0].count);

    res.render('index', {
      customerCount: totalCustomers,
      customers: customers.rows,
      page,
      totalPages: Math.ceil(totalCustomers / PAGE_SIZE),
      revenue: Number(revenue.rows[0].sum) || 0,
      sales: sales.rows,
      orderCount: Number(orderCount.rows[0].count),
      issuesCount: Number(issuesCount.rows[0].count),
      issues: issues.rows,
      notifCount: Number(notifCount.rows[0].count),
      notifications: notifications.rows,
      tasks: tasks.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('database error');
  }
});


app.listen(port, () => {
  console.log(`app is running in port ${port}`); 
} )