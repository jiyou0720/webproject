var express = require('express');
var path = require('path');
var bcrypt = require('bcrypt');
var mysql = require('mysql2');
var router = express.Router();
var app = express();
var multer  = require('multer');
var upload = multer({ dest: 'uploads/' });
var saltRounds = 10;
const port = 3000;

var pool = mysql.createPool({
    host: 'svc.sel4.cloudtype.app',
    user: 'root',
    password: '1234',
    database: 'fleamarket',
    port : 31887
}).promise();

module.exports = pool;

// users 테이블 생성
var createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        birth_year INT,
        birth_month INT,
        birth_day INT,
        gender ENUM('Male', 'Female', 'Others'),
        postal_code VARCHAR(255),
        address VARCHAR(255),
        detailed_address VARCHAR(255),
        phone_number VARCHAR(255)
    )
`;

// posts 테이블 생성
var createPostsTable = `
    CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        price INT,
        content TEXT NOT NULL,
        file_path VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;

var alterPostsTable = `
    ALTER TABLE posts
    ADD file_path VARCHAR(255)
`;

pool.query(createPostsTable)
    .then(([rows, fields]) => {
        console.log('Table \'posts\' is created successfully or it already exists');
    })
    .catch(err => {
        console.error(err.message);
    });



pool.query(createUsersTable)
    .then(([rows, fields]) => {
        console.log('Table \'users\' is created successfully or it already exists');
    })
    .catch(err => {
        console.error(err.message);
    });

pool.query(createPostsTable)
    .then(([rows, fields]) => {
        console.log('Table \'posts\' is created successfully or it already exists');
    })
    .catch(err => {
        console.error(err.message);
    });

router.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, '../html/main page/main.html'));
});

router.get('/register', function(req, res) {
    res.sendFile(path.join(__dirname, '../html/register page/register.html'));
});

router.get('/post', function(req, res) {
    res.sendFile(path.join(__dirname, '../html/post page/post.html'));
});

router.get('/write', function(req, res) {
    res.sendFile(path.join(__dirname, '../html/write page/write.html'));
});

router.get('/posts', async function(req, res) {
    var sql = 'SELECT * FROM posts';
    try {
        const [rows, fields] = await pool.query(sql);
        res.send(rows);
    } catch (err) {
        console.log(err);
        res.status(500).send('Error in fetching posts');
    }
});


router.post('/signup', async function(req, res) {
    var { username, password, email, birth_year, birth_month, birth_day, gender, postal_code, address, detailed_address, phone_number } = req.body;

    bcrypt.hash(password, saltRounds, async function(err, hash) {
        if (err) {
            console.log(err);
            res.status(500).send('Error in hashing password');
            return; // 함수를 종료하여 두 번째 응답을 보내는 것을 방지.
        }

        var sql = 'INSERT INTO users (username, password, email, birth_year, birth_month, birth_day, gender, postal_code, address, detailed_address, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        try {
            const [rows, fields] = await pool.query(sql, [username, hash, email, birth_year, birth_month, birth_day, gender, postal_code, address, detailed_address, phone_number]);
            res.redirect('/');
        } catch (err) {
            console.log(err);
            res.status(500).send('Error in inserting user');
            return; // 함수를 종료하여 두 번째 응답을 보내는 것을 방지.
        }
    });
});




router.post('/login', async function(req, res) {
    var { username, password } = req.body;

    var sql = 'SELECT * FROM users WHERE username = ?';
    try {
        const [rows, fields] = await pool.query(sql, [username]);
        if (rows.length === 0) {
            res.status(400).send('User not found');
            return;
        }

        var hash = rows[0].password;
        bcrypt.compare(password, hash, function(err, isMatch) {
            if (err) {
                console.log(err);
                res.status(500).send('Error in comparing password');
                return;
            }

            if (!isMatch) {
                res.status(400).send('Password is incorrect');
            } else {
                res.redirect('/post'); // 로그인이 성공하면 post 페이지로 리다이렉트
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('Error in fetching user');
    }
});

router.post('/write', upload.single('file'), async function(req, res) {
    var { title, price, content } = req.body;
    var file = req.file;
    var filePath = file ? file.path : null;

    console.log(filePath);

    var sql = 'INSERT INTO posts (title, price, content, file_path) VALUES (?, ?, ?, ?)';
    try {
        const [rows, fields] = await pool.query(sql, [title, price, content, filePath]);
        res.json({ message: 'success' });  // 'message' 포함하여 응답 보내기
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'failure' });  // 오류 발생 시 'message' 포함하여 응답 보내기
    }
});




app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', router);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(express.static(path.join(__dirname, '../html/main page')));
app.use(express.static(path.join(__dirname, '../html/post page')));
app.use(express.static(path.join(__dirname, '../html/register page')));
app.use(express.static(path.join(__dirname, '../html/nptice page')));
app.use(express.static(path.join(__dirname, '../html/write page')));

app.listen(port, () => {
  console.log(`서버가 ${port}번 포트에서 실행중입니다.`);
});

console.log("main.js가 실행되었습니다.");
