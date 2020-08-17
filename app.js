
const _ = require('lodash')
const fs = require('fs')

const mongoose = require('mongoose')
const express = require('express')
const fileUpload = require('express-fileupload')
const cors = require('cors')
const Schema = mongoose.Schema
const app = express()
const bodyParser = require('body-parser')

const userScheme = new Schema({
  name: String,
  company: [{ type: Schema.Types.ObjectId, ref: 'Company' }],
  photoName: String
},
{ versionKey: false })

const companyScheme = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  name: String
},
{ versionKey: false })

const User = mongoose.model('User', userScheme)
const Company = mongoose.model('Company', companyScheme)

app.use(bodyParser.json())
app.use(fileUpload())

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})

app.use(cors())
app.use(express.static('uploads')) // static

const url = 'mongodb://localhost:27017/july'
mongoose.connect(url, { useUnifiedTopology: true, useNewUrlParser// change name photoFile on user._id: true })
  .then(() => console.log('Data Base is Connected!'))
  .catch(err => {
    console.log(err)
  })

app.get('/api/users/:id', function (req, res) { // her we come from "getUser"
  const id = req.params.id
  User.findById(id)
    .exec((err, user) => {
      if (err) console.log(err)
      return res.json(user)
    })
})

app.get('/api/users', function (req, res) { // get USERS
  User.find()
    .populate('company') // open\append companies
    .lean() // parse to JSON
    .exec((err, users) => {
      if (err) console.log(err)
      users = _.map(users, (item) => {
        item.company = _.head(item.company)
        item.photoName = `${item._id}.${_.last(item.photoName.split('.'))}`
        return item
      })
      return res.json(users)
    })
})

app.get('/api/companies', async function (req, res) { // get companies
  await Company.find(function (err, companies) {
    if (err) console.log(err)
    return res.json(companies)
  })
})

app.post('/api/users', function (req, res) { // here we come from "saveUser"
  if (!req.body) return res.sendStatus(400)
  const userName = req.body.name
  const idCompany = req.body.company
  const parsedFileName = (req.body.photo).split('.') // parse name of file
  const user = new User({
    name: userName,
    company: [{ _id: idCompany }],
    photoName: req.body.photo
  })
  user.save(async function (err) {
    if (err) return console.log(err)
    user.photoName = `${user._id}.${_.last(parsedFileName)}` // change name photoFile on user._id
    await user.save()
    res.json(user)
  })
})

app.post('/uploads', function (req, res) { // PUTing photo on server

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('NO files where uploaded!')
  }
  const photoFile = req.files.photoFile
  const parsedFileName = (req.files.photoFile.name).split('.')
  const userID = req.body.userID
  fs.writeFile(`uploads/${userID}.${_.last(parsedFileName)}`, photoFile.data, (err) => {
    if (err) throw err
    console.log('The file has been saved!')
  })
  return res.sendStatus(200)
})

app.delete('/api/users/:id', function (req, res) {
  const id = req.params.id
  User.findByIdAndDelete(id, function (err, user) {
    if (err) return console.log(err)
    res.send(user)
  })
})

app.put('/api/users/:id/', function (req, res) {
  const id = req.params.id
  const newName = req.body.name
  const idCompany = req.body.company
  const parsedFileName = req.body.photoName.split('.')
  User.updateOne({ _id: id },
    {
      $set:
      {
        name: newName,
        company: [{ _id: idCompany }],
        photoName: `${id}.${_.last(parsedFileName)}`
      }
    }, function (err, user) {
      if (err) return console.log(err)
      res.json({ status: 'success' })
    })
})
