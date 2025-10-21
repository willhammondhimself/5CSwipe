#!/usr/bin/env python3
"""
CMC Portal HTML Inspector
Examines the actual HTML structure to identify correct selectors
"""

import requests
from bs4 import BeautifulSoup
import re

def inspect_portal():
    """Inspect the CMC portal HTML structure"""
    
    base_url = "https://portal.claremontmckenna.edu/ICS/Portal_Homepage.jnz"
    search_url = "https://portal.claremontmckenna.edu/ICS/Portal_Homepage.jnz?portlet=External_Content"
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (compatible; 5C-Course-Inspector/1.0; Educational Use)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    })
    
    try:
        print("🔍 Inspecting CMC Portal HTML Structure...")
        response = session.get(search_url)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Save the HTML for manual inspection
        with open('cmc_portal_page.html', 'w', encoding='utf-8') as f:
            f.write(soup.prettify())
        print("💾 Saved portal HTML to 'cmc_portal_page.html'")
        
        print("\n🔍 Analyzing HTML structure...")
        
        # Look for forms
        forms = soup.find_all('form')
        print(f"📝 Found {len(forms)} forms")
        for i, form in enumerate(forms):
            action = form.get('action', 'No action')
            method = form.get('method', 'GET')
            print(f"   Form {i+1}: {method} -> {action}")
        
        # Look for select elements (dropdowns)
        selects = soup.find_all('select')
        print(f"\n📋 Found {len(selects)} select dropdowns:")
        for select in selects:
            name = select.get('name', 'No name')
            id_attr = select.get('id', 'No ID')
            options = len(select.find_all('option'))
            print(f"   Select: name='{name}', id='{id_attr}', options={options}")
            
            # Show first few options if they exist
            option_values = [opt.get('value', '') for opt in select.find_all('option')[:5]]
            if option_values:
                print(f"      Sample values: {option_values}")
        
        # Look for tables
        tables = soup.find_all('table')
        print(f"\n📊 Found {len(tables)} tables")
        for i, table in enumerate(tables):
            rows = len(table.find_all('tr'))
            cols = len(table.find_all('th')) or len(table.find_all('td', limit=10))
            class_attr = table.get('class', [])
            id_attr = table.get('id', 'No ID')
            print(f"   Table {i+1}: {rows} rows, ~{cols} cols, class={class_attr}, id={id_attr}")
        
        # Look for input fields
        inputs = soup.find_all('input')
        input_types = {}
        for inp in inputs:
            inp_type = inp.get('type', 'text')
            name = inp.get('name', 'No name')
            input_types[inp_type] = input_types.get(inp_type, 0) + 1
        
        print(f"\n📝 Found {len(inputs)} input fields:")
        for inp_type, count in input_types.items():
            print(f"   {inp_type}: {count}")
        
        # Look for specific course-related text patterns
        text = soup.get_text()
        course_indicators = ['course', 'section', 'enrollment', 'schedule', 'instructor']
        print(f"\n🎯 Course-related content analysis:")
        for indicator in course_indicators:
            count = len(re.findall(indicator, text, re.IGNORECASE))
            print(f"   '{indicator}': {count} occurrences")
        
        # Look for any obvious course search interfaces
        course_forms = []
        for form in forms:
            form_text = form.get_text().lower()
            if any(word in form_text for word in ['course', 'search', 'schedule', 'class']):
                course_forms.append(form)
        
        print(f"\n🎓 Potential course search forms: {len(course_forms)}")
        
        # Check for JavaScript or AJAX endpoints
        scripts = soup.find_all('script')
        api_patterns = []
        for script in scripts:
            if script.string:
                # Look for API endpoints or AJAX calls
                matches = re.findall(r'["\']https?://[^"\']*api[^"\']*["\']', script.string, re.IGNORECASE)
                matches.extend(re.findall(r'["\']https?://[^"\']*course[^"\']*["\']', script.string, re.IGNORECASE))
                api_patterns.extend(matches)
        
        if api_patterns:
            print(f"\n🔗 Found potential API endpoints:")
            for pattern in set(api_patterns):
                print(f"   {pattern}")
        
        print(f"\n✅ Inspection complete! Check 'cmc_portal_page.html' for detailed structure")
        
        return True
        
    except Exception as e:
        print(f"❌ Error inspecting portal: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    inspect_portal()