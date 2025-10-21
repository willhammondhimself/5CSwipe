#!/usr/bin/env python3
"""
HTTP API Server for CMC Course Scraper
Provides REST endpoints for React Native TypeScript app
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from cmc_portal_scraper import FiveCCourseScraper
import logging
import json
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native

# Initialize the scraper
scraper = FiveCCourseScraper()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': '5C Course Scraper API'
    })

@app.route('/course-areas', methods=['GET'])
def get_course_areas():
    """Get all available course areas"""
    try:
        areas = scraper.get_course_areas()
        return jsonify({
            'success': True,
            'count': len(areas),
            'areas': areas,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting course areas: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/terms', methods=['GET'])
def get_terms():
    """Get available terms"""
    try:
        terms = scraper.get_available_terms()
        return jsonify({
            'success': True,
            'count': len(terms),
            'terms': terms,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting terms: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/courses', methods=['GET'])
def search_courses():
    """Search courses with filters"""
    try:
        # Get query parameters
        term = request.args.get('term', 'FA 2025')
        course_area = request.args.get('area', '')
        course_code = request.args.get('code', '')
        instructor = request.args.get('instructor', '')
        status = request.args.get('status', '')
        days_param = request.args.get('days', '')
        
        # Parse days parameter
        days = days_param.split(',') if days_param else []
        
        logger.info(f"Searching courses: term={term}, area={course_area}, code={course_code}")
        
        # Search courses
        courses = scraper.search_courses(
            term=term,
            course_area=course_area,
            course_code=course_code,
            instructor=instructor,
            days=days,
            status=status
        )
        
        return jsonify({
            'success': True,
            'count': len(courses),
            'courses': courses,
            'filters': {
                'term': term,
                'area': course_area,
                'code': course_code,
                'instructor': instructor,
                'days': days,
                'status': status
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error searching courses: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/courses/<course_area>', methods=['GET'])
def get_courses_by_area(course_area):
    """Get all courses for a specific area"""
    try:
        term = request.args.get('term', 'FA 2025')
        
        logger.info(f"Getting courses for area: {course_area}")
        
        courses = scraper.search_courses(
            term=term,
            course_area=course_area
        )
        
        return jsonify({
            'success': True,
            'area': course_area,
            'term': term,
            'count': len(courses),
            'courses': courses,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting courses for {course_area}: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'area': course_area,
            'timestamp': datetime.now().isoformat()
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'available_endpoints': [
            'GET /health',
            'GET /terms', 
            'GET /course-areas',
            'GET /courses',
            'GET /courses/<area>'
        ],
        'timestamp': datetime.now().isoformat()
    }), 404

if __name__ == '__main__':
    print("🚀 Starting 5C Course Scraper API Server...")
    print("📍 Available endpoints:")
    print("   GET /health - Health check")
    print("   GET /terms - Available terms")
    print("   GET /course-areas - All course areas")
    print("   GET /courses?term=FA 2025&area=Computer Science - Search courses")
    print("   GET /courses/Computer Science?term=FA 2025 - Courses by area")
    print("\n🌐 Server running on http://localhost:8085")
    
    app.run(
        host='0.0.0.0',
        port=8085,
        debug=True,
        use_reloader=False  # Avoid double startup in debug mode
    )