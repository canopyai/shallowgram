import re

def is_longer_than_one_word(s):
    # Remove leading and trailing spaces
    stripped_string = s.strip()
    
    # Remove special characters
    cleaned_string = re.sub(r'[^A-Za-z\s]', '', stripped_string)
    
    # Check if the resulting string contains a space, indicating more than one word
    return ' ' in cleaned_string