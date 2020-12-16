const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require("express-session");

// Models!
const Event = require('./models/Event')
const Course = require('./models/Course')
const Resource = require('./models/Resource')
const User = require('./models/User')
const Faculty = require('./models/Faculty')

//*******************************************
//***********Controllers*********************

const courseController = require('./controllers/courseController');
const resourceController = require('./controllers/resourceController');
const profileController = require('./controllers/profileController');
const notificationController = require('./controllers/notificationController');
const messageController = require('./controllers/messageController');
const eventController = require('./controllers/eventController');
const tagController = require('./controllers/tagController');
const utils = require('./controllers/utils');


//*******************************************
//***********Database connection*************

// const MONGODB_URI = 'mongodb://localhost/ENACT';
const MONGODB_URI = process.env.MONGODB_URI_IND || 'mongodb://localhost/ENACT';
const mongoose = require('mongoose');

// Makes connection asynchronously.  Mongoose will queue up database
// operations and release them when the connection is complete.
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log("mongo connected")
});

const app = express();
//*******************************************
//***********Middleware setup****************

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// register middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
}));

// configure auth router
const auth = require('./routes/auth')
app.use(auth)

// configure aws router
const aws = require('./routes/aws')
app.use(aws)

//*******************************************
//***********Index page router***************

//we can use this or the index router to handle req
app.get('/',
    utils.checkUserName,
    resourceController.loadPublicResources,
    (req, res) =>
        res.render('./pages/index'))

app.get('/about',
    (req, res) =>
        res.render('./pages/about'))

app.get('/help',
    (req, res) =>
        res.render('./pages/help'))

//*******************************************
//***********Course related******************
app.get('/course',
    utils.checkUserName,
    (req, res) =>
        res.render('./pages/createCourse'))

// rename this to /createCourse and update the ejs form
app.post('/course',
    courseController.createNewClass,
    courseController.addToOwnedCourses
)

app.get('/courses',
    utils.checkUserName,
    (req, res) =>
        res.render('./pages/showCourses')
)

app.get('/course/view/:courseId',
    utils.checkUserName,
    courseController.showOneCourse,
    resourceController.loadResources
)

app.get('/course/update/:courseId',
    utils.checkUserName,
    async (req, res) => {
        let courseInfo = await Course.findOne({_id: req.params.courseId})
        res.render('./pages/updateCourse', {
            courseInfo: courseInfo
        })
    }
)

app.post('/course/update/:courseId',
    utils.checkUserName,
    courseController.updateCourse
)


app.get('/course/copy/:courseId',
    utils.checkUserName,
    async (req, res) => {
        let courseInfo = await Course.findOne({_id: req.params.courseId})
        res.render('./pages/copyCourse', {
            courseInfo: courseInfo
        })
    }
)


app.post('/course/copy/:courseId',
    utils.checkUserName,
    courseController.copyCourse
)

app.post('/course/delete/:courseId',
    utils.checkUserName,
    async (req, res) => {
        await Course.deleteOne({_id: req.params.courseId})
        res.redirect('back')
    }
)

// render join course view
app.get('/course/join',
    utils.checkUserName,
    (req, res) => {
        res.render('./pages/joinACourse')
    }
)

// process join course
app.post('/course/join',
    courseController.joinCourse
)

//*******************************************
//***********Resource related****************

app.get('/resource/upload/course/:courseId',
    utils.checkUserName,
    (req, res) => {
        res.render('./pages/uploadToCourse', {
            req: req
        })
    })

app.post('/resource/upload/course/:courseId',
    resourceController.uploadResource
)

app.get('/resources/search/private/general',
    utils.checkUserName,
    (req, res) =>
        res.render('./pages/searchPrimary')
)

app.get('/resources/search/private/general/results',
    resourceController.reloadSearch
)

app.post('/resources/search/private/general/results',
    resourceController.primarySearch
)

app.get('/resource/upload/public',
    utils.checkUserName,
    (req, res) => {
        if (req.user.status !== 'admin')
            res.send("You are not admin!")
        else
            res.render('./pages/uploadToPublic')
    }
)

app.post('/resource/upload/public',
    resourceController.uploadToPublicResr
)

app.get('/resources/search/private/advanced',
    utils.checkUserName,
    (req, res) =>
        res.render('./pages/search'))

app.post('/resources/search/private/advanced',
    resourceController.advancedSearch
)


app.get('/resources/view/public/all',
    utils.checkUserName,
    resourceController.showPublic
)

app.get('/resources/search/public/general',
    utils.checkUserName,
    (req, res) =>
        res.render('./pages/publicPrimarySearch')
)

app.post('/resources/view/public/generalResult',
    resourceController.primaryPublicSearch
)

app.get('/resources/search/public/advanced',
    utils.checkUserName,
    (req, res) =>
        res.render('./pages/publicSearch'))

app.post('/resources/view/public/advancedResult',
    resourceController.advancedSearchPublic
)

app.get('/resources/view/faculty',
    utils.checkUserName,
    resourceController.loadAllFacultyResources,
    (req, res) =>
        res.render('./pages/facultyGuide')
)

app.get('/resources/view/faculty/:contentType',
    utils.checkUserName,
    resourceController.loadSpecificContentType,
)


app.get('/resource/upload/faculty',
    utils.checkUserName,
    (req, res) =>
        res.render('./pages/uploadToFaculty')
)

app.post('/resource/upload/faculty',
    resourceController.uploadResource
)

app.post('/updateResource/:resourceId',
    resourceController.updateResource
)

app.post('/resource/remove/:resourceId',
    resourceController.removeResource
)

app.post('/resource/hide/:resourceId',
    resourceController.removePublicResource
)

app.post('/resource/show/:resourceId',
    resourceController.postPublicResource
)

app.get('/resources/view/favorite',
    utils.checkUserName,
    resourceController.showStarredResources
)

app.post('/resource/star/:resourceId',
    resourceController.starResource
)

app.post('/resource/unstar/:resourceId',
    resourceController.unstarResource
)

app.post('/resource/starAlt/:resourceId',
    resourceController.starResourceAlt
)

app.post('/resource/unstarAlt/:resourceId',
    resourceController.unstarResourceAlt
)

app.get('/resources/view/private',
    utils.checkUserName,
    resourceController.showMyResources
)

app.get('/resources/all',
    async (req, res) => {
        let resources
        // ENACT users
        if (res.locals.loggedIn) {
            // admin/student requesting
            if (res.locals.status === 'admin' || res.locals.status === 'faculty')
                resources = await Resource.find({
                    checkStatus: 'approve'
                })
            else
                resources = await Resource.find({
                    checkStatus: 'approve',
                    status: {$in: ["privateToENACT", "public", "finalPublic"]}
                })
        }
        // public users
        else {
            resources = await Resource.find({
                checkStatus: 'approve',
                status: {$in: ["finalPublic", "public"]}
            })
            console.log("hello: ", resources)
        }
        return res.send(resources)
    }
)

app.get('/resource/update/:resourceId/:option',
    async (req, res) => {
        let resource = await Resource.findOne({_id: req.params.resourceId})
        let ownerId = resource.ownerId
        let tempUser = await User.findOne({_id: ownerId})
        let ownerName1 = tempUser.userName
        res.render('./pages/updateOwner', {
            resource: resource,
            ownerName1: ownerName1,
            req: req
        })
    }
)

app.post('/resource/update/:resourceId/:option',
    resourceController.updateOwner
)

app.post('/studentUpdateResource/:resourceId',
    resourceController.studentUpdateResource
)

app.get('/managePublicResources',
    resourceController.loadAllPublicResources,
    (req, res) =>
        res.render('./pages/managePublicResources')
)

app.get('/collection/view/:resourceSetId',
    resourceController.loadCollection,
    (req, res) =>
        res.render('./pages/showCollection')
)

app.post('/removeFromCollection/:collectionId/:resourceId',
    resourceController.removeFromCollection
)

app.post('/addToCollection/:collectionId/:resourceId',
    resourceController.addToCollection
)

app.post('/createCollection',
    resourceController.createCollection
)

app.post('/deleteCollection/:collectionId',
    resourceController.deleteCollection
)
//*******************************************
//***********Notification related************

app.get('/reviewResource',
    utils.checkUserName,
    notificationController.loadUnderReviewResources
)

app.post('/approve',
    notificationController.approve
)

app.post('/toPublic',
    notificationController.toPublic
)

app.post('/tempdeny',
    notificationController.deny
)

app.post('/resumeResource/:resourceId',
    notificationController.resume
)

app.post('/commentResource/:resourceId',
    notificationController.comment
)

app.post('/sendDeny',
    notificationController.sendDeny
)

app.get('/approvePublicResources',
    notificationController.loadPartPublicResources
)
app.post('/partPublicToPublic',
    notificationController.partPublicToPublic
)

app.post('/partPublicToENACT',
    notificationController.partPublicToENACT
)

app.get('/secretFunction',
    resourceController.resetWord2Id
)

app.get('/secretFunction2',
    async (req, res) => {
        let allRes = await Resource.find()
        for (var resource in allRes) {
            let author = await User.findOne(allRes[resource].ownerId)
            if (author) {
                allRes[resource].ownerName = author.userName
                await allRes[resource].save()
            }
        }
        res.send("Success!")
    }
)

app.get('/secretFunction3',
    async (req, res) => {
        let allFaculty = await Faculty.find()
        for (var i in allFaculty) {
            let faculty = await User.findOne({
                $or: [
                    {workEmail: allFaculty[i].email}, {googleemail: allFaculty[i].email}
                ]
            })
            if (faculty) {
                allFaculty[i].userId = faculty._id
                await allFaculty[i].save()
            } else {
                console.log("to be deleted: ", allFaculty[i])
                await Faculty.deleteOne({email: allFaculty[i].email})
            }
        }
        res.send("Success!")
    }
)

//show all profiles from all users
app.get('/profile/send/:id',
    messageController.sendProfileEmail
)

//*******************************************
//***********Profile related*****************

//show all profiles from all users
app.get('/profile/view/:id',
    async (req, res, next) => {
        // update own profile first
        if (res.locals.user.userName === undefined) {
            res.render('./pages/updateProfile')
        } else {
            next()
        }
    },
    profileController.findOneUser
)

app.get('/profiles/view/faculty',
    profileController.showFacultyProfiles
)

app.get('/profile/update',
    (req, res) => {
        res.render('./pages/updateProfile')
    }
)

app.get('/profile/update/:userId',
    async (req, res) => {
        let account = await User.findOne({_id: req.params.userId})
        res.render('./pages/updateProfileAdmin', {
            account: account,
        })
    }
)

app.post('/profile/update/:userId',
    profileController.updateProfileAdmin
)

app.get('/profiles/view/all',
    utils.checkUserName,
    profileController.showAllProfiles
)

app.post('/profile/update',
    profileController.updateProfile
)

app.get('/profile/create/faculty',
    utils.checkUserName,
    profileController.loadFaculty
)

app.post('/profile/create/faculty',
    profileController.createFaculty
)

app.post('/saveProfileImageURL',
    profileController.updateProfileImageURL
)

//show all profiles from all users
app.post('/saveProfileImageURL-admin/:userId',
    profileController.updateProfileImageURLAdmin
)


//*******************************************
//************Message related****************
app.get('/messages/view/:sender/:receiver/:resourceId',
    utils.checkUserName,
    messageController.loadMessagingPage
)

app.post('/messages/save/:sender/:receiver/:resourceId',
    messageController.saveMessage
)

app.get('/messages/view/all',
    utils.checkUserName,
    messageController.loadMessageBoard
)

app.get('/showDenied',
    notificationController.loadDeniedResources
)

app.get('/approvedResources',
    notificationController.loadApprovedResources
)

app.get('/showPublic',
    notificationController.loadMyPublicResources
)

//*******************************************
//*************Event related*****************

app.get('/events',
    async (req, res) => {
        let eventsInfo = await Event.find({}).sort({start: -1})
        res.locals.eventsInfo = eventsInfo
        res.render('./pages/calendar')
    }
)

app.get('/events/all',
    async (req, res) => {
        let now = new Date();
        let eventsInfo;
        if (res.locals.loggedIn) {
            eventsInfo = await Event.find({}).sort({start: -1})
        } else {
            eventsInfo = await Event.find({visibility: 'public'}).sort({start: -1})
        }
        for (let i = 0; i < eventsInfo.length; i++) {
            eventsInfo[i].start = new Date(eventsInfo[i].start - (now.getTimezoneOffset() * 60000))
            eventsInfo[i].end = new Date(eventsInfo[i].end - (now.getTimezoneOffset() * 60000))
        }
        return res.send(eventsInfo)
    }
)

app.get('/profiles/all',
    async (req, res) => {
        let userProfiles = await User.find()
        return res.send(userProfiles)
    }
)

app.get('/profiles/faculties',
    async (req, res) => {
        console.log("status: ", req.user.status)
        // if (req.user.status === 'admin') res.send("You are not admin!")
        // else {
        let userProfiles = await User.find({
            $or: [
                {status: 'faculty'}, {status: 'admin'}
            ]
        })
        console.log("faculties: ", userProfiles)
        return res.send(userProfiles)
        // }
    }
)


app.post('/event/delete/:eventId',
    eventController.deleteEvent
)

app.post('/event/edit/:eventId',
    eventController.editEvent
)

app.post('/event/save',
    eventController.saveEvent
)

//*******************************************
//*************Tag related*****************
app.post('/addTags',
    tagController.addTags
)

app.get('/approveTags',
    tagController.loadUnderReviewTags
)

app.post('/agreeTags',
    tagController.agreeTags
)

app.post('/denyTags',
    tagController.denyTags
)

app.get('/newAreas',
    tagController.loadTags
)

//*******************************************
//*************Error related*****************

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.send("error message: " + err.message);
});

module.exports = app;