// ==========================================
// SkillBridge - SIH26044
// Frontend JavaScript
// ==========================================

const API = "/api";

// Check whether backend is reachable
async function checkBackend() {
    try {
        const response = await fetch("/");
        console.log("SkillBridge frontend connected.");
        return response.ok;
    } catch (error) {
        console.error("Backend connection failed:", error);
        return false;
    }
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", function (event) {
        const targetId = this.getAttribute("href");

        if (targetId === "#") return;

        const target = document.querySelector(targetId);

        if (target) {
            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth"
            });
        }
    });
});

// Explore Opportunities button
function exploreOpportunities() {
    const section =
        document.querySelector("#opportunities") ||
        document.querySelector(".opportunities") ||
        document.querySelector("#features");

    if (section) {
        section.scrollIntoView({
            behavior: "smooth"
        });
    } else {
        alert("Opportunities module is coming next!");
    }
}

// Skill Match demo
function checkSkillMatch() {
    const skills = prompt(
        "Enter your skills separated by commas:\nExample: JavaScript, Node.js, SQL"
    );

    if (!skills) return;

    const studentSkills = skills
        .split(",")
        .map(skill => skill.trim().toLowerCase())
        .filter(Boolean);

    const requiredSkills = [
        "javascript",
        "node.js",
        "sql",
        "docker",
        "aws"
    ];

    const matchedSkills = requiredSkills.filter(skill =>
        studentSkills.includes(skill)
    );

    const missingSkills = requiredSkills.filter(skill =>
        !studentSkills.includes(skill)
    );

    const score = Math.round(
        (matchedSkills.length / requiredSkills.length) * 100
    );

    alert(
        `Skill Match Score: ${score}%\n\n` +
        `Matched: ${matchedSkills.join(", ") || "None"}\n\n` +
        `Skill Gap: ${missingSkills.join(", ") || "None"}`
    );
}

// Get Started button
function getStarted() {
    alert(
        "Welcome to SkillBridge!\n\n" +
        "Student registration will be connected in the next step."
    );
}

// Login button
function openLogin() {
    alert("Login system will be connected in the next step.");
}

document.addEventListener("DOMContentLoaded", () => {
    checkBackend();

    console.log("SkillBridge SIH26044 loaded successfully.");
});