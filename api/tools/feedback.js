const fs = require('fs');

// Storage file for all feedback
const FEEDBACK_FILE = 'feedback_data.json';

// Load existing feedback from file
function loadFeedback() {
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      const data = fs.readFileSync(FEEDBACK_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading feedback:', e.message);
  }
  return { feedbacks: [], suggestions: [], reports: [], lastId: 0 };
}

// Save feedback to file
function saveFeedback(data) {
  try {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving feedback:', e.message);
    return false;
  }
}

// Helper to add new entry
function addEntry(type, message, uid, name = 'Anonymous') {
  const data = loadFeedback();
  data.lastId = (data.lastId || 0) + 1;
  const newEntry = {
    id: data.lastId,
    type: type,
    message: message,
    uid: uid || 'unknown',
    name: name,
    timestamp: new Date().toISOString(),
    status: 'pending' // pending, reviewed, resolved
  };
  
  if (type === 'feedback') data.feedbacks.unshift(newEntry);
  else if (type === 'suggestion') data.suggestions.unshift(newEntry);
  else if (type === 'report') data.reports.unshift(newEntry);
  
  saveFeedback(data);
  return newEntry;
}

const meta = {
  name: 'Feedback System',
  path: '/feedback?action=submit&type=feedback&message=&uid=1&name=',
  method: 'get',
  category: 'tools'
};

async function onStart({ req, res }) {
  const { action, type, message, uid, name, id, status, limit = 20, page = 1 } = req.query;

  // ========== SUBMIT FEEDBACK ==========
  if (action === 'submit') {
    if (!message) {
      return res.status(400).json({
        status: false,
        error: 'Missing required parameter: message',
        usage: '/feedback?action=submit&type=feedback&message=Your message here&uid=123&name=John'
      });
    }

    const validTypes = ['feedback', 'suggestion', 'report'];
    const feedbackType = validTypes.includes(type) ? type : 'feedback';
    
    const newEntry = addEntry(feedbackType, message, uid || 'anonymous', name || 'Anonymous');
    
    let responseMessage = '';
    if (feedbackType === 'feedback') responseMessage = 'Thank you for your feedback! We appreciate it 💖';
    else if (feedbackType === 'suggestion') responseMessage = 'Thanks for your suggestion! We\'ll consider it for future updates 🚀';
    else responseMessage = 'Your report has been submitted. We\'ll look into it as soon as possible 🙏';
    
    return res.json({
      status: true,
      message: responseMessage,
      entry: {
        id: newEntry.id,
        type: feedbackType,
        message: message,
        timestamp: newEntry.timestamp
      }
    });
  }

  // ========== VIEW ALL FEEDBACK ==========
  if (action === 'list') {
    const data = loadFeedback();
    let results = [];
    
    if (type === 'feedback') results = data.feedbacks;
    else if (type === 'suggestion') results = data.suggestions;
    else if (type === 'report') results = data.reports;
    else {
      // Combine all types
      results = [...data.feedbacks, ...data.suggestions, ...data.reports];
      results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    // Pagination
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = results.slice(start, start + parseInt(limit));
    
    return res.json({
      status: true,
      total: results.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(results.length / parseInt(limit)),
      feedbacks: paginated
    });
  }

  // ========== VIEW SINGLE FEEDBACK ==========
  if (action === 'view' && id) {
    const data = loadFeedback();
    const allEntries = [...data.feedbacks, ...data.suggestions, ...data.reports];
    const entry = allEntries.find(e => e.id == id);
    
    if (!entry) {
      return res.status(404).json({
        status: false,
        error: 'Feedback not found'
      });
    }
    
    return res.json({
      status: true,
      feedback: entry
    });
  }

  // ========== UPDATE FEEDBACK STATUS (Admin) ==========
  if (action === 'update' && id && status) {
    const data = loadFeedback();
    let found = false;
    
    const updateStatus = (arr) => {
      const index = arr.findIndex(e => e.id == id);
      if (index !== -1) {
        arr[index].status = status;
        found = true;
        return true;
      }
      return false;
    };
    
    updateStatus(data.feedbacks) || updateStatus(data.suggestions) || updateStatus(data.reports);
    
    if (!found) {
      return res.status(404).json({
        status: false,
        error: 'Feedback not found'
      });
    }
    
    saveFeedback(data);
    return res.json({
      status: true,
      message: `Feedback #${id} status updated to: ${status}`
    });
  }

  // ========== DELETE FEEDBACK (Admin) ==========
  if (action === 'delete' && id) {
    const data = loadFeedback();
    let found = false;
    
    const deleteFromArray = (arr) => {
      const index = arr.findIndex(e => e.id == id);
      if (index !== -1) {
        arr.splice(index, 1);
        found = true;
        return true;
      }
      return false;
    };
    
    deleteFromArray(data.feedbacks) || deleteFromArray(data.suggestions) || deleteFromArray(data.reports);
    
    if (!found) {
      return res.status(404).json({
        status: false,
        error: 'Feedback not found'
      });
    }
    
    saveFeedback(data);
    return res.json({
      status: true,
      message: `Feedback #${id} has been deleted`
    });
  }

  // ========== STATISTICS ==========
  if (action === 'stats') {
    const data = loadFeedback();
    return res.json({
      status: true,
      stats: {
        total_feedbacks: data.feedbacks.length,
        total_suggestions: data.suggestions.length,
        total_reports: data.reports.length,
        pending: [
          ...data.feedbacks.filter(f => f.status === 'pending'),
          ...data.suggestions.filter(s => s.status === 'pending'),
          ...data.reports.filter(r => r.status === 'pending')
        ].length,
        resolved: [
          ...data.feedbacks.filter(f => f.status === 'resolved'),
          ...data.suggestions.filter(s => s.status === 'resolved'),
          ...data.reports.filter(r => r.status === 'resolved')
        ].length
      }
    });
  }

  // ========== DEFAULT - SHOW USAGE ==========
  return res.json({
    status: true,
    available_actions: {
      submit: {
        description: 'Submit feedback, suggestion, or report',
        example: '/feedback?action=submit&type=feedback&message=The command is broken&uid=123&name=Jaybohol'
      },
      list: {
        description: 'View all submissions',
        example: '/feedback?action=list&type=feedback&limit=10&page=1'
      },
      view: {
        description: 'View single submission by ID',
        example: '/feedback?action=view&id=1'
      },
      stats: {
        description: 'Get statistics about all submissions',
        example: '/feedback?action=stats'
      },
      update: {
        description: 'Update submission status (admin)',
        example: '/feedback?action=update&id=1&status=resolved'
      },
      delete: {
        description: 'Delete submission (admin)',
        example: '/feedback?action=delete&id=1'
      }
    },
    types: ['feedback', 'suggestion', 'report'],
    statuses: ['pending', 'reviewed', 'resolved']
  });
}

module.exports = { meta, onStart };
