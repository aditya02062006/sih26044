/* =========================================================
   MEDISETU - SIH26044
   Backend Server
   Node.js + Express + JSON Database
========================================================= */

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "medisetu_sih26044_secret_key_change_in_production";

const DB_PATH =
    path.join(__dirname, "database.json");

const PUBLIC_PATH =
    path.join(__dirname, "public");
app.use(express.static(PUBLIC_PATH));

app.get("/", (req, res) => {
    res.sendFile(path.join(PUBLIC_PATH, "index.html"));
});

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true
    })
);
// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// Homepage
app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});
app.use(
    express.static(PUBLIC_PATH)
);


/* =========================================================
   DATABASE HELPERS
========================================================= */

function createDefaultDB() {

    return {
        users: [],
        profiles: [],
        jobs: [],
        applications: []
    };
}


function ensureDatabase() {

    if (!fs.existsSync(DB_PATH)) {

        fs.writeFileSync(
            DB_PATH,
            JSON.stringify(
                createDefaultDB(),
                null,
                2
            )
        );

        return;
    }


    try {

        const raw =
            fs.readFileSync(
                DB_PATH,
                "utf8"
            );


        const db =
            raw.trim()
                ? JSON.parse(raw)
                : createDefaultDB();


        if (!Array.isArray(db.users))
            db.users = [];

        if (!Array.isArray(db.profiles))
            db.profiles = [];

        if (!Array.isArray(db.jobs))
            db.jobs = [];

        if (!Array.isArray(db.applications))
            db.applications = [];


        fs.writeFileSync(
            DB_PATH,
            JSON.stringify(
                db,
                null,
                2
            )
        );

    }
    catch (error) {

        console.error(
            "Database initialization error:",
            error
        );

        throw new Error(
            "database.json contains invalid JSON."
        );
    }

}


function readDB() {

    ensureDatabase();

    try {

        const data =
            fs.readFileSync(
                DB_PATH,
                "utf8"
            );

        return JSON.parse(data);

    }
    catch (error) {

        console.error(
            "Database read error:",
            error
        );

        return createDefaultDB();
    }

}


function writeDB(db) {

    try {

        fs.writeFileSync(
            DB_PATH,
            JSON.stringify(
                db,
                null,
                2
            ),
            "utf8"
        );

        return true;

    }
    catch (error) {

        console.error(
            "Database write error:",
            error
        );

        return false;
    }

}


/* =========================================================
   ID GENERATOR
========================================================= */

function generateId(prefix) {

    return (
        prefix +
        "_" +
        Date.now() +
        "_" +
        crypto
            .randomBytes(4)
            .toString("hex")
    );
}


/* =========================================================
   JWT AUTHENTICATION
========================================================= */

function authenticate(req, res, next) {

    const authHeader =
        req.headers.authorization;


    if (!authHeader) {

        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });

    }


    const parts =
        authHeader.split(" ");


    if (
        parts.length !== 2 ||
        parts[0] !== "Bearer"
    ) {

        return res.status(401).json({
            success: false,
            message: "Invalid authorization format."
        });

    }


    const token =
        parts[1];


    try {

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );


        req.user =
            decoded;


        next();

    }
    catch (error) {

        return res.status(401).json({
            success: false,
            message: "Invalid or expired login session."
        });

    }

}


/* =========================================================
   ROLE AUTHORIZATION
========================================================= */

function allowRoles(...roles) {

    return (req, res, next) => {

        if (!req.user) {

            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });

        }


        if (
            !roles.includes(
                req.user.role
            )
        ) {

            return res.status(403).json({
                success: false,
                message: "You do not have permission for this action."
            });

        }


        next();

    };

}


/* =========================================================
   HOME / SERVER TEST
========================================================= */

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            success: true,
            app: "MediSetu",
            problemStatement: "SIH26044",
            status: "Backend running",
            timestamp:
                new Date().toISOString()
        });

    }
);


/* =========================================================
   REGISTER
========================================================= */

app.post(
    "/api/register",
    async (req, res) => {

        try {

            const {
                name,
                email,
                password,
                role
            } = req.body;


            if (
                !name ||
                !email ||
                !password
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Name, email and password are required."
                });

            }


            if (password.length < 6) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Password must contain at least 6 characters."
                });

            }


            const db =
                readDB();


            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            const existingUser =
                db.users.find(
                    user =>
                        user.email
                            .toLowerCase()
                            ===
                        normalizedEmail
                );


            if (existingUser) {

                return res.status(409).json({
                    success: false,
                    message:
                        "An account with this email already exists."
                });

            }


            const allowedRoles = [
                "student",
                "industry",
                "institution"
            ];


            const userRole =
                allowedRoles.includes(role)
                    ? role
                    : "student";


            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );


            const user = {

                id:
                    generateId("user"),

                name:
                    name.trim(),

                email:
                    normalizedEmail,

                password:
                    hashedPassword,

                role:
                    userRole,

                createdAt:
                    new Date().toISOString()

            };


            db.users.push(user);


            const profile = {

                id:
                    generateId("profile"),

                userId:
                    user.id,

                fullName:
                    user.name,

                email:
                    user.email,

                role:
                    user.role,

                phone: "",

                institution: "",

                course: "",

                specialization: "",

                location: "",

                bio: "",

                skills: [],

                updatedAt:
                    new Date().toISOString()

            };


            db.profiles.push(profile);


            writeDB(db);


            const token =
                jwt.sign(
                    {
                        id:
                            user.id,

                        email:
                            user.email,

                        role:
                            user.role,

                        name:
                            user.name
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "7d"
                    }
                );


            return res.status(201).json({

                success: true,

                message:
                    "Registration successful.",

                token,

                user: {
                    id:
                        user.id,

                    name:
                        user.name,

                    email:
                        user.email,

                    role:
                        user.role
                }

            });

        }
        catch (error) {

            console.error(
                "Register error:",
                error
            );


            return res.status(500).json({
                success: false,
                message: "Registration failed."
            });

        }

    }
);


/* =========================================================
   LOGIN
========================================================= */

app.post(
    "/api/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;


            if (
                !email ||
                !password
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Email and password are required."
                });

            }


            const db =
                readDB();


            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            const user =
                db.users.find(
                    item =>
                        item.email
                            .toLowerCase()
                            ===
                        normalizedEmail
                );


            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password."
                });

            }


            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (!passwordMatch) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password."
                });

            }


            const token =
                jwt.sign(
                    {
                        id:
                            user.id,

                        email:
                            user.email,

                        role:
                            user.role || "student",

                        name:
                            user.name
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "7d"
                    }
                );


            return res.json({

                success: true,

                message:
                    "Login successful.",

                token,

                user: {
                    id:
                        user.id,

                    name:
                        user.name,

                    email:
                        user.email,

                    role:
                        user.role || "student"
                }

            });

        }
        catch (error) {

            console.error(
                "Login error:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to login."
            });

        }

    }
);


/* =========================================================
   CURRENT USER
========================================================= */

app.get(
    "/api/me",
    authenticate,
    (req, res) => {

        const db =
            readDB();


        const user =
            db.users.find(
                item =>
                    item.id === req.user.id
            );


        if (!user) {

            return res.status(404).json({
                success: false,
                message:
                    "User not found."
            });

        }


        return res.json({

            success: true,

            user: {
                id:
                    user.id,

                name:
                    user.name,

                email:
                    user.email,

                role:
                    user.role || "student"
            }

        });

    }
);


/* =========================================================
   GET PROFILE
========================================================= */

app.get(
    "/api/profile",
    authenticate,
    (req, res) => {

        const db =
            readDB();


        let profile =
            db.profiles.find(
                item =>
                    item.userId
                    ===
                    req.user.id
            );


        if (!profile) {

            const user =
                db.users.find(
                    item =>
                        item.id
                        ===
                        req.user.id
                );


            profile = {

                id:
                    generateId("profile"),

                userId:
                    req.user.id,

                fullName:
                    user?.name || "",

                email:
                    user?.email || "",

                role:
                    user?.role || "student",

                phone: "",

                institution: "",

                course: "",

                specialization: "",

                location: "",

                bio: "",

                skills: [],

                updatedAt:
                    new Date().toISOString()

            };


            db.profiles.push(profile);

            writeDB(db);

        }


        res.json({
            success: true,
            profile
        });

    }
);


/* =========================================================
   UPDATE PROFILE
========================================================= */

app.put(
    "/api/profile",
    authenticate,
    (req, res) => {

        const db =
            readDB();


        let profile =
            db.profiles.find(
                item =>
                    item.userId
                    ===
                    req.user.id
            );


        if (!profile) {

            profile = {

                id:
                    generateId("profile"),

                userId:
                    req.user.id
            };


            db.profiles.push(profile);

        }


        const allowedFields = [

            "fullName",
            "phone",
            "institution",
            "course",
            "specialization",
            "location",
            "bio",
            "skills",
            "education",
            "experience"

        ];


        allowedFields.forEach(
            field => {

                if (
                    req.body[field]
                    !==
                    undefined
                ) {

                    profile[field] =
                        req.body[field];

                }

            }
        );


        profile.updatedAt =
            new Date().toISOString();


        writeDB(db);


        return res.json({

            success: true,

            message:
                "Profile saved successfully.",

            profile

        });

    }
);


/* =========================================================
   SAVE STUDENT SKILLS
========================================================= */

app.put(
    "/api/profile/skills",
    authenticate,
    allowRoles("student"),
    (req, res) => {

        const {
            skills
        } = req.body;


        if (!Array.isArray(skills)) {

            return res.status(400).json({
                success: false,
                message:
                    "Skills must be an array."
            });

        }


        const db =
            readDB();


        let profile =
            db.profiles.find(
                item =>
                    item.userId
                    ===
                    req.user.id
            );


        if (!profile) {

            profile = {

                id:
                    generateId("profile"),

                userId:
                    req.user.id,

                skills: []

            };


            db.profiles.push(profile);

        }


        profile.skills =
            [...new Set(skills)];


        profile.updatedAt =
            new Date().toISOString();


        writeDB(db);


        res.json({

            success: true,

            message:
                "Skill assessment saved.",

            skills:
                profile.skills

        });

    }
);


/* =========================================================
   GET ALL OPPORTUNITIES
========================================================= */

app.get(
    "/api/jobs",
    (req, res) => {

        const db =
            readDB();


        res.json({

            success: true,

            count:
                db.jobs.length,

            jobs:
                db.jobs

        });

    }
);


/* =========================================================
   GET SINGLE OPPORTUNITY
========================================================= */

app.get(
    "/api/jobs/:id",
    (req, res) => {

        const db =
            readDB();


        const job =
            db.jobs.find(
                item =>
                    String(item.id)
                    ===
                    String(req.params.id)
            );


        if (!job) {

            return res.status(404).json({
                success: false,
                message:
                    "Opportunity not found."
            });

        }


        return res.json({
            success: true,
            job
        });

    }
);


/* =========================================================
   APPLY FOR OPPORTUNITY
   SAVES RECORD PERMANENTLY
========================================================= */

app.post(
    "/api/applications/job/:id",
    authenticate,
    allowRoles("student"),
    (req, res) => {

        const db =
            readDB();


        const job =
            db.jobs.find(
                item =>
                    String(item.id)
                    ===
                    String(req.params.id)
            );


        if (!job) {

            return res.status(404).json({
                success: false,
                message:
                    "Opportunity not found."
            });

        }


        const existing =
            db.applications.find(
                item =>
                    item.studentId
                    ===
                    req.user.id
                    &&
                    String(
                        item.opportunityId
                    )
                    ===
                    String(job.id)
            );


        if (existing) {

            return res.status(409).json({
                success: false,
                message:
                    "You have already applied for this opportunity."
            });

        }


        const application = {

            id:
                generateId(
                    "application"
                ),

            studentId:
                req.user.id,

            studentName:
                req.user.name || "",

            studentEmail:
                req.user.email || "",

            opportunityId:
                String(job.id),

            opportunityType:
                job.type ||
                "Internship",

            title:
                job.title,

            company:
                job.company,

            location:
                job.location ||
                "Not specified",

            duration:
                job.duration ||
                "Not specified",

            match:
                job.match || 0,

            skills:
                Array.isArray(job.skills)
                    ? job.skills
                    : [],

            status:
                "Applied",

            appliedAt:
                new Date()
                    .toISOString(),

            updatedAt:
                new Date()
                    .toISOString(),

            timeline: [

                {
                    status:
                        "Applied",

                    date:
                        new Date()
                            .toISOString(),

                    note:
                        "Application submitted successfully."
                }

            ]

        };


        db.applications.push(
            application
        );


        writeDB(db);


        return res.status(201).json({

            success: true,

            message:
                "Application submitted and saved successfully.",

            application

        });

    }
);


/* =========================================================
   STUDENT - MY APPLICATIONS
========================================================= */

app.get(
    "/api/applications/my",
    authenticate,
    allowRoles("student"),
    (req, res) => {

        const db =
            readDB();


        const applications =
            db.applications
                .filter(
                    item =>
                        item.studentId
                        ===
                        req.user.id
                )
                .sort(
                    (a, b) =>
                        new Date(
                            b.appliedAt || 0
                        )
                        -
                        new Date(
                            a.appliedAt || 0
                        )
                );


        res.json({

            success: true,

            count:
                applications.length,

            applications

        });

    }
);


/* =========================================================
   GET ONE APPLICATION
========================================================= */

app.get(
    "/api/applications/:id",
    authenticate,
    (req, res) => {

        const db =
            readDB();


        const application =
            db.applications.find(
                item =>
                    item.id
                    ===
                    req.params.id
            );


        if (!application) {

            return res.status(404).json({
                success: false,
                message:
                    "Application not found."
            });

        }


        if (
            req.user.role === "student"
            &&
            application.studentId
            !==
            req.user.id
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Access denied."
            });

        }


        res.json({
            success: true,
            application
        });

    }
);


/* =========================================================
   INDUSTRY / INSTITUTION
   VIEW ALL APPLICATIONS
========================================================= */

app.get(
    "/api/applications",
    authenticate,
    allowRoles(
        "industry",
        "institution"
    ),
    (req, res) => {

        const db =
            readDB();


        const applications =
            [...db.applications]
                .sort(
                    (a, b) =>
                        new Date(
                            b.appliedAt || 0
                        )
                        -
                        new Date(
                            a.appliedAt || 0
                        )
                );


        res.json({

            success: true,

            count:
                applications.length,

            applications

        });

    }
);


/* =========================================================
   UPDATE APPLICATION STATUS
   Applied → Under Review → Shortlisted →
   Interview → Selected / Rejected
========================================================= */

app.patch(
    "/api/applications/:id/status",
    authenticate,
    allowRoles(
        "industry",
        "institution"
    ),
    (req, res) => {

        const {
            status,
            note
        } = req.body;


        const allowedStatuses = [

            "Applied",
            "Under Review",
            "Shortlisted",
            "Interview",
            "Selected",
            "Rejected"

        ];


        if (
            !allowedStatuses.includes(
                status
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid application status.",

                allowedStatuses

            });

        }


        const db =
            readDB();


        const application =
            db.applications.find(
                item =>
                    item.id
                    ===
                    req.params.id
            );


        if (!application) {

            return res.status(404).json({
                success: false,
                message:
                    "Application not found."
            });

        }


        application.status =
            status;


        application.updatedAt =
            new Date()
                .toISOString();


        if (
            !Array.isArray(
                application.timeline
            )
        ) {

            application.timeline = [];

        }


        application.timeline.push({

            status,

            date:
                new Date()
                    .toISOString(),

            note:
                note ||
                `Application moved to ${status}.`

        });


        writeDB(db);


        res.json({

            success: true,

            message:
                "Application status updated successfully.",

            application

        });

    }
);


/* =========================================================
   DASHBOARD STATS
========================================================= */

app.get(
    "/api/dashboard/student",
    authenticate,
    allowRoles("student"),
    (req, res) => {

        const db =
            readDB();


        const applications =
            db.applications.filter(
                item =>
                    item.studentId
                    ===
                    req.user.id
            );


        const profile =
            db.profiles.find(
                item =>
                    item.userId
                    ===
                    req.user.id
            );


        const skills =
            Array.isArray(
                profile?.skills
            )
                ? profile.skills
                : [];


        const selected =
            applications.filter(
                item =>
                    item.status
                    ===
                    "Selected"
            ).length;


        const shortlisted =
            applications.filter(
                item =>
                    item.status
                    ===
                    "Shortlisted"
                    ||
                    item.status
                    ===
                    "Interview"
            ).length;


        res.json({

            success: true,

            stats: {

                totalSkills:
                    skills.length,

                applications:
                    applications.length,

                shortlisted,

                placements:
                    selected,

                availableOpportunities:
                    db.jobs.length

            }

        });

    }
);


/* =========================================================
   SKILL GAP ANALYSIS API
========================================================= */

app.post(
    "/api/skill-gap/:jobId",
    authenticate,
    allowRoles("student"),
    (req, res) => {

        const db =
            readDB();


        const job =
            db.jobs.find(
                item =>
                    String(item.id)
                    ===
                    String(
                        req.params.jobId
                    )
            );


        if (!job) {

            return res.status(404).json({
                success: false,
                message:
                    "Opportunity not found."
            });

        }


        const requestSkills =
            Array.isArray(req.body.skills)
                ? req.body.skills
                : null;


        const profile =
            db.profiles.find(
                item =>
                    item.userId
                    ===
                    req.user.id
            );


        const studentSkills =
            requestSkills
            ||
            (
                Array.isArray(
                    profile?.skills
                )
                    ? profile.skills
                    : []
            );


        const requiredSkills =
            Array.isArray(
                job.skills
            )
                ? job.skills
                : [];


        const matchedSkills =
            requiredSkills.filter(
                skill =>
                    studentSkills.includes(
                        skill
                    )
            );


        const missingSkills =
            requiredSkills.filter(
                skill =>
                    !studentSkills.includes(
                        skill
                    )
            );


        const matchPercentage =
            requiredSkills.length
                ?
                Math.round(
                    (
                        matchedSkills.length
                        /
                        requiredSkills.length
                    )
                    *
                    100
                )
                :
                0;


        const trainingRecommendations =
            missingSkills.map(
                skill => ({
                    skillGap:
                        skill,

                    recommendation:
                        `${skill} Training Module`,

                    type:
                        "Recommended Training"
                })
            );


        res.json({

            success: true,

            opportunity: {
                id:
                    job.id,

                title:
                    job.title,

                company:
                    job.company
            },

            assessment: {

                totalRequiredSkills:
                    requiredSkills.length,

                matchedCount:
                    matchedSkills.length,

                gapCount:
                    missingSkills.length,

                matchPercentage,

                matchedSkills,

                missingSkills

            },

            trainingRecommendations

        });

    }
);


/* =========================================================
   DELETE / WITHDRAW APPLICATION
========================================================= */

app.delete(
    "/api/applications/:id",
    authenticate,
    allowRoles("student"),
    (req, res) => {

        const db =
            readDB();


        const index =
            db.applications.findIndex(
                item =>
                    item.id
                    ===
                    req.params.id
                    &&
                    item.studentId
                    ===
                    req.user.id
            );


        if (index === -1) {

            return res.status(404).json({
                success: false,
                message:
                    "Application not found."
            });

        }


        const removed =
            db.applications.splice(
                index,
                1
            )[0];


        writeDB(db);


        res.json({

            success: true,

            message:
                "Application withdrawn successfully.",

            application:
                removed

        });

    }
);


/* =========================================================
   API NOT FOUND
========================================================= */

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "API route not found."

        });

    }
);


/* =========================================================
   START SERVER
========================================================= */

ensureDatabase();


app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "\n========================================"
        );

        console.log(
            "        MediSetu - SIH26044"
        );

        console.log(
            "========================================"
        );

        console.log(
            "Backend Server Started ✅"
        );

        console.log(
            `Port: ${PORT}`
        );

        console.log(
            `Local URL: http://localhost:${PORT}`
        );

        console.log(
            "Database: database.json"
        );

        console.log(
            "Application Tracking: Enabled"
        );

        console.log(
            "Skill Gap Engine: Enabled"
        );

        console.log(
            "Placement Tracking: Enabled"
        );

        console.log(
            "========================================\n"
        );

    }
);