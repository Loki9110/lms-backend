export const getPublishedCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .select('title description price thumbnail instructor ratings')
      .populate('instructor', 'name');

    res.status(200).json({
      success: true,
      courses
    });
  } catch (error) {
    console.error('Error fetching published courses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching courses'
    });
  }
}; 