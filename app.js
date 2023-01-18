const express = require('express')
const { Server } = require('socket.io')
const handlebars = require('express-handlebars')
const app = express()
const TableManager = require('./controllers/tableManager.js')
const optionChat = require('./options/chatDB.js')
const optionProd = require('./options/productDb.js')
const fakerProducts = require('./options/fakerProducts')
const session = require('express-session')
const FileStore = require('session-file-store')
const cookieParser = require("cookie-parser");

const Store = FileStore(session)

app.use(cookieParser());

app.use(session({
    store: new Store({
        path: './sessions',
        ttl: 60,
    }),
    secret: 'b4ck3end',
    resave: false,
    saveUninitialized: false
}))

const server = app.listen(8080, () => console.log('Server UP'))
const io = new Server(server)

const tablaChat = 'chat'
const tablaProductos = 'products'

let manejadorChat = new TableManager( optionChat, tablaChat)
let manejadorProductos = new TableManager(optionProd, tablaProductos)

app.use(express.urlencoded({extended: true}))
app.use(express.static('public'))

app.engine('handlebars', handlebars.engine())
app.set('views', 'public/views')
app.set('view engine', 'handlebars')


const loginChecker = (req, res, next)=>{
    if(!req.session.user){
        res.redirect('/login')
    } else{
        next()
    }
}

app.get('/login', async (req, resp)=>{
    resp.render('login')
})

app.get('/', loginChecker, async (req, resp)=>{
    await manejadorProductos.createTable()
    await manejadorChat.createTable()
    resp.render('home', {usuario: req.session.user})
})

app.post('/', async (req, resp)=>{
    req.session.user = req.body.user
    resp.redirect('/')
})

app.get('/logout', async (req, resp)=>{
    let usuarioBorrado = req.session.user
    resp.clearCookie('connect.sid')
    req.session.destroy()
    resp.render('logout', {usuario: usuarioBorrado})
})

app.get('/api/productos-test', async (req, resp)=>{
    resp.render('homeTester')
})

let historial = []
let productos = []
let productosTest = []

io.on('connection', async socket =>{
    console.log("New client connected")
    productosTest = fakerProducts
    productos = await manejadorProductos.getInfo()
    historial = await manejadorChat.getInfo()
    socket.emit('products', productos)
    socket.emit("history", historial)
    socket.emit("productsTest", productosTest)
    socket.on('product', async data => {
        await manejadorProductos.save(data)
        productos = await manejadorProductos.getInfo()
        io.emit('products', productos)
    })
    socket.on("chat", async data =>{
        await manejadorChat.save(data)
        historial = await manejadorChat.getInfo()
        io.emit("history", historial)
    })
   
})