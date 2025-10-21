#!/usr/bin/env python3
"""
Quick test of CMC course search form
Tests the correct webapps.cmc.edu endpoint
"""

import requests
from bs4 import BeautifulSoup

def test_cmc_form():
    print("🔍 Testing CMC Course Search Form...")
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (compatible; 5C-Course-Inspector/1.0; Educational Use)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    })
    
    try:
        # Test the form endpoint
        print("📋 Checking form at webapps.cmc.edu...")
        response = session.get('https://webapps.cmc.edu/course-search/form.php')
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Save the form HTML for inspection
        with open('cmc_course_form.html', 'w', encoding='utf-8') as f:
            f.write(soup.prettify())
        print("💾 Saved form HTML to 'cmc_course_form.html'")
        
        # Look for form elements
        forms = soup.find_all('form')
        print(f"📝 Found {len(forms)} forms")
        
        if forms:
            form = forms[0]
            action = form.get('action', 'No action')
            method = form.get('method', 'GET')
            print(f"   Form action: {action}")
            print(f"   Form method: {method}")
            
            # Find select elements (dropdowns)
            selects = form.find_all('select')
            print(f"\n📋 Found {len(selects)} select dropdowns:")
            for select in selects:
                name = select.get('name', 'No name')
                options = len(select.find_all('option'))
                print(f"   {name}: {options} options")
                
                # Show sample options
                sample_options = select.find_all('option')[:5]
                for opt in sample_options:
                    value = opt.get('value', '')
                    text = opt.get_text(strip=True)
                    print(f"      '{value}' -> '{text}'")
            
            # Find input fields
            inputs = form.find_all('input')
            print(f"\n📝 Found {len(inputs)} input fields:")
            for inp in inputs:
                inp_type = inp.get('type', 'text')
                name = inp.get('name', 'No name')
                print(f"   {inp_type}: {name}")
        
        print(f"\n✅ Form test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing form: {e}")
        return False

if __name__ == "__main__":
    test_cmc_form()