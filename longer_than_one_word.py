import re

def is_longer_than_one_word(s):
    # Remove leading and trailing spaces
    stripped_string = s.strip()
    
    # Remove special characters
    cleaned_string = re.sub(r'[^A-Za-z\s]', '', stripped_string)
    
    # Check if the resulting string contains a space, indicating more than one word
    return ' ' in cleaned_string


def is_valid_string(s):
    # Define a regular expression pattern for allowed characters
    # This includes alphanumeric characters and the specified punctuation
    pattern = r'^[a-zA-Z0-9.,?!%:;"\s]*$'
    
    # Use the fullmatch method to check if the entire string matches the pattern
    if re.fullmatch(pattern, s):
        return True
    else:
        return False