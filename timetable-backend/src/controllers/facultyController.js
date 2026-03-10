const Faculty = require('../models/Faculty');
const FacultyPreference = require('../models/FacultyPreference');
const FacultyLeave = require('../models/FacultyLeave');
const Course = require('../models/Course');
const AcademicCalendar = require('../models/AcademicCalendar');

/**
 * Resolve faculty from Clerk user
 */
async function resolveFaculty(req) {
  const clerkUserId =
    req.auth?.userId ||
    req.user?.clerkUserId ||
    req.userId;

  // debug info to help trace auth -> faculty linking
  console.log('resolveFaculty called. clerkUserId:', clerkUserId, 'request email:', req.user?.email);

  if (!clerkUserId) return null;

  let faculty = await Faculty.findOne({ clerkUserId });
  if (faculty) {
    console.log('resolveFaculty - matched by clerkUserId:', faculty._id?.toString());
    return faculty;
  }

  const email = req.user?.email;
  if (!email) {
    console.log('resolveFaculty - no email in request user.');
    return null;
  }

  faculty = await Faculty.findOne({ email });
  if (!faculty) {
    console.log('resolveFaculty - no faculty found for email:', email);
    return null;
  }

  faculty.clerkUserId = clerkUserId;
  await faculty.save();
  console.log('resolveFaculty - linked faculty', faculty._id?.toString(), 'to clerkUserId:', clerkUserId);
  return faculty;
}

/* ================= CONTROLLERS ================= */

exports.getProfile = async (req, res, next) => {
  try {
    const faculty = await resolveFaculty(req);
    if (!faculty) {
      return res.status(404).json({ success: false, error: 'Faculty profile not found' });
    }
    res.json({ success: true, data: faculty });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const faculty = await resolveFaculty(req);
    if (!faculty) {
      return res.status(404).json({ success: false, error: 'Faculty profile not found' });
    }

    faculty.contactNumber = req.body.contactNumber ?? faculty.contactNumber;
    faculty.specialization = req.body.specialization ?? faculty.specialization;

    await faculty.save();
    res.json({ success: true, data: faculty });
  } catch (err) {
    next(err);
  }
};

exports.getAvailableCourses = async (req, res, next) => {
  try {
    const faculty = await resolveFaculty(req);
    if (!faculty) {
      console.log('getAvailableCourses - faculty not found for request');
      return res.status(404).json({ success: false, error: 'Faculty profile not found' });
    }

    console.log('getAvailableCourses - faculty.department:', faculty.department);

    let courses = await Course.find({
      isActive: true,
      department: faculty.department
    }).sort({ year: 1, section: 1 });

    // If department filtering returns none, fallback to returning all active courses
    if (!courses || courses.length === 0) {
      console.log('getAvailableCourses - no courses for department, falling back to all active courses');
      courses = await Course.find({ isActive: true }).sort({ year: 1, section: 1 });
    }

    console.log('getAvailableCourses - courses fetched:', courses.length);

    res.json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
};

exports.submitPreferences = async (req, res, next) => {
  try {
    const faculty = await resolveFaculty(req);
    if (!faculty) {
      return res.status(404).json({ success: false, error: 'Faculty profile not found' });
    }

    const { academicCalendarId, preferences } = req.body;

    if (!preferences || preferences.length === 0) {
      return res.status(400).json({ success: false, error: 'No preferences selected' });
    }

    const formatted = preferences.map((courseId, i) => ({
      course: courseId,
      priority: i + 1
    }));

    // Use find + save so pre('save') validation runs (findOneAndUpdate bypasses save hooks)
    // Check for existing preference
    let pref = await FacultyPreference.findOne({
      faculty: faculty._id,
      academicCalendar: academicCalendarId
    });

    if (pref) {
      pref.preferences = formatted;
      pref.isSubmitted = true;
      pref.submittedAt = new Date();
      await pref.save();
    } else {
      pref = new FacultyPreference({
        faculty: faculty._id,
        academicCalendar: academicCalendarId,
        preferences: formatted,
        isSubmitted: true,
        submittedAt: new Date()
      });
      await pref.save();
    }

    await pref.populate('preferences.course');

    res.json({
      success: true,
      message: 'Preferences submitted successfully',
      data: pref
    });
  } catch (err) {
    next(err);
  }
};

exports.getPreferences = async (req, res, next) => {
  try {
    const faculty = await resolveFaculty(req);
    if (!faculty) {
      return res.status(404).json({ success: false, error: 'Faculty profile not found' });
    }

    const prefs = await FacultyPreference.find({ faculty: faculty._id })
      .populate('preferences.course')
      .sort({ submittedAt: -1 });

    res.json({ success: true, data: prefs });
  } catch (err) {
    next(err);
  }
};

exports.applyLeave = async (req, res, next) => {
  try {
    const faculty = await resolveFaculty(req);
    if (!faculty) {
      return res.status(404).json({ success: false, error: 'Faculty profile not found' });
    }

    const leave = await FacultyLeave.create({
      faculty: faculty._id,
      ...req.body
    });

    res.status(201).json({ success: true, data: leave });
  } catch (err) {
    next(err);
  }
};

exports.updateAvailability = async (req, res, next) => {
  try {
    const faculty = await resolveFaculty(req);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        error: 'Faculty profile not found'
      });
    }

    faculty.availability = req.body.availability;
    await faculty.save();

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      data: faculty
    });
  } catch (err) {
    next(err);
  }
};


exports.getLeaveHistory = async (req, res, next) => {
  try {
    const faculty = await resolveFaculty(req);
    const leaves = await FacultyLeave.find({ faculty: faculty._id });
    res.json({ success: true, data: leaves });
  } catch (err) {
    next(err);
  }
};

exports.cancelLeave = async (req, res, next) => {
  try {
    const faculty = await resolveFaculty(req);
    await FacultyLeave.deleteOne({
      _id: req.params.id,
      faculty: faculty._id,
      status: 'pending'
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
