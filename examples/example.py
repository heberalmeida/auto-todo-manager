"""
Example Python file demonstrating TODO comment usage
"""

# TODO: Add type hints to all functions
def process_data(data):
    """Process the input data and return results."""
    results = []
    for item in data:
        results.append(transform(item))
    return results

# FIXME: This function has a potential division by zero error
def calculate_average(numbers):
    return sum(numbers) / len(numbers)

# BUG: This doesn't handle empty strings correctly
def parse_user_input(input_string):
    return input_string.strip().lower()

# HACK: Temporary workaround for library compatibility issue
def import_external_library():
    try:
        import new_library
        return new_library
    except ImportError:
        # TODO: Update to new library once it's stable
        import old_library
        return old_library

# NOTE: This function uses recursion - watch for stack overflow on large inputs
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

def transform(item):
    """Transform a single item."""
    return item

