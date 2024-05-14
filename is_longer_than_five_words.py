import re
def is_longer_than_five_words(s):
    # Remove leading and trailing spaces
    stripped_string = s.strip()
    
    # Remove special characters
    cleaned_string = re.sub(r'[^A-Za-z\s]', '', stripped_string)
    
    # Split the cleaned string into words
    words = cleaned_string.split()
    
    # Check if the number of words is greater than 5
    return len(words) > 5