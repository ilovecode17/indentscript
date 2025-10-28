# IndentScript

<div align="center">

![Version](https://img.shields.io/badge/version-2.8.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D12.0.0-brightgreen.svg)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey.svg)

**A powerful JavaScript superset that combines Python's elegant syntax with JavaScript's ecosystem**

[Features](#features) • [Installation](#installation) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Examples](#examples) • [Contributing](#contributing)

</div>

---

## 🚀 What is IndentScript?

IndentScript is a transpiler that allows you to write JavaScript using Python's intuitive syntax. Write clean, readable code with indentation-based blocks, Pythonic keywords, and familiar constructs, then transpile it to vanilla JavaScript that runs anywhere.

### Why IndentScript?

- **Pythonic Syntax**: Use `def`, indentation blocks, and Python-style constructs
- **JavaScript Compatible**: All valid JavaScript code works in IndentScript
- **Zero Dependencies**: Lightweight standalone transpiler
- **Bidirectional**: Mix Python and JavaScript syntax freely
- **Production Ready**: Robust error handling and comprehensive feature set
- **Universal**: Runs on Node.js, browsers, and anywhere JavaScript runs

---

## ✨ Features

### Core Language Features

#### **Function Definitions**
```python
def greet(name, greeting="Hello"):
    print(f"{greeting}, {name}!")
    return name.upper()
```

#### **Classes & Inheritance**
```python
class Animal:
    def __init__(self, name):
        this.name = name
    
    def speak(self):
        print(f"{this.name} makes a sound")

class Dog(Animal):
    def speak(self):
        print(f"{this.name} barks")
```

#### **Advanced Loops**
```python
for i in range(10):
    print(f"Number: {i}")

for index, value in enumerate(items):
    print(f"Item {index}: {value}")

for x, y in coordinates:
    print(f"Point: ({x}, {y})")
```

#### **F-Strings & Template Literals**
```python
name = "Alice"
age = 30
print(f"My name is {name} and I'm {age} years old")
```

#### **Lambda Expressions**
```python
square = lambda x: x * x
add = lambda a, b: a + b
numbers = [1, 2, 3, 4, 5]
squared = numbers.map(lambda x: x * x)
```

#### **Exception Handling**
```python
try:
    result = risky_operation()
except ValueError as e:
    print(f"Error: {e}")
except:
    print("An error occurred")
finally:
    cleanup()
```

#### **Context Managers**
```python
with open_file("data.txt") as file:
    content = file.read()
    print(content)
```

#### **Async/Await**
```python
async def fetch_data(url):
    response = await fetch(url)
    data = await response.json()
    return data
```

#### **Generators**
```python
def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b
```

#### **Python Built-ins**
- `len(array)` → `array.length`
- `range(start, stop, step)` → Array generation
- `enumerate(iterable)` → Index-value pairs
- Python list methods: `append()`, `extend()`, `pop()`
- Python string methods: `upper()`, `lower()`, `strip()`, `split()`

#### **Boolean & Identity Operators**
```python
if x > 5 and y < 10:
    print("Condition met")

if value is None:
    print("Value is null")

if item in array:
    print("Found!")
```

#### **Mathematical Operators**
```python
power = 2 ** 8
floor_div = 17 // 3
```

#### **Assertions**
```python
assert x > 0, "X must be positive"
assert len(items) > 0, "List cannot be empty"
```

#### **Control Flow**
```python
for i in range(100):
    if i % 2 == 0:
        continue
    if i > 50:
        break
    print(i)
```

---

## 📦 Installation

### Quick Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/ilovecode17/indentscript/refs/heads/main/install.sh | sh
```

This will download and install IndentScript globally on your system.

### Manual Installation

```bash
git clone https://github.com/ilovecode17/indentscript.git
cd src
chmod +x indentscript.js
```

Add to your PATH (optional):
```bash
sudo cp indentscript.js /usr/local/bin/indentscript
```

### Requirements

- Node.js >= 12.0.0
- No additional dependencies required

---

## 🎯 Quick Start

### 1. Create Your First IndentScript File

Create `hello.isc`:

```python
def main():
    name = "World"
    print(f"Hello, {name}!")
    
    numbers = range(1, 6)
    for num in numbers:
        print(f"Number: {num}")

main()
```

### 2. Transpile to JavaScript

```bash
node indentscript.js --transpile hello.isc
```

This generates `hello.js`:

```javascript
function main() {
  const name = "World";
  console.log(`Hello, ${name}!`);
  
  const numbers = Array.from({length: 6 - 1}, (_, i) => i + 1);
  for (const num of numbers) {
    console.log(`Number: ${num}`);
  }
}

main();
```

### 3. Execute Directly

```bash
node indentscript.js --execute hello.isc
```

Output:
```
Hello, World!
Number: 1
Number: 2
Number: 3
Number: 4
Number: 5
```

---

## 📚 Documentation

### Command Line Interface

#### Transpile Files
```bash
node indentscript.js --transpile <input.isc> [output.js]
node indentscript.js -t <input.isc> [output.js]
```

Transpiles IndentScript code to JavaScript. If no output file is specified, creates a `.js` file with the same name.

#### Execute Files
```bash
node indentscript.js --execute <input.isc>
node indentscript.js -e <input.isc>
```

Directly executes IndentScript code without creating intermediate files.

#### Version Information
```bash
node indentscript.js --version
node indentscript.js -v
```

Displays the current version (2.8.0).

#### Help
```bash
node indentscript.js --help
node indentscript.js -h
```

Shows usage information and available commands.

---

## 💡 Examples

### Example 1: Fibonacci Sequence

**Input (`fibonacci.isc`):**
```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

for i in range(10):
    print(f"fibonacci({i}) = {fibonacci(i)}")
```

**Transpile:**
```bash
node indentscript.js -t fibonacci.isc
```

### Example 2: Object-Oriented Programming

**Input (`calculator.isc`):**
```python
class Calculator:
    def __init__(self, initial=0):
        this.value = initial
    
    def add(self, x):
        this.value = this.value + x
        return this
    
    def subtract(self, x):
        this.value = this.value - x
        return this
    
    def multiply(self, x):
        this.value = this.value * x
        return this
    
    def divide(self, x):
        if x == 0:
            raise Error("Division by zero")
        this.value = this.value / x
        return this
    
    def result(self):
        return this.value

calc = Calculator(100)
result = calc.add(50).multiply(2).subtract(100).divide(2).result()
print(f"Result: {result}")
```

### Example 3: Async Operations

**Input (`async.isc`):**
```python
async def fetch_user_data(user_id):
    try:
        response = await fetch(f"https://api.example.com/users/{user_id}")
        data = await response.json()
        return data
    except Exception as e:
        print(f"Error fetching user: {e}")
        return None

async def main():
    user = await fetch_user_data(123)
    if user is not None:
        print(f"User: {user.name}")

main()
```

### Example 4: Data Processing

**Input (`data_processing.isc`):**
```python
def process_data(items):
    filtered = items.filter(lambda x: x > 10)
    mapped = filtered.map(lambda x: x * 2)
    reduced = mapped.reduce(lambda acc, x: acc + x, 0)
    return reduced

numbers = [5, 12, 8, 20, 15, 3, 18]
result = process_data(numbers)
print(f"Processed result: {result}")

for index, value in enumerate(numbers):
    print(f"Index {index}: {value}")
```

### Example 5: Error Handling

**Input (`error_handling.isc`):**
```python
def divide_numbers(a, b):
    try:
        assert b != 0, "Denominator cannot be zero"
        result = a / b
        return result
    except AssertionError as e:
        print(f"Assertion Error: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None
    finally:
        print("Division operation completed")

print(divide_numbers(10, 2))
print(divide_numbers(10, 0))
```

---

## 🔧 Advanced Usage

### Mixing Python and JavaScript Syntax

IndentScript is a true superset - you can mix both syntaxes:

```python
def calculate(x, y):
    const result = x + y
    return result

const numbers = [1, 2, 3, 4, 5]

for num in numbers:
    console.log(`Number: ${num}`)
```

### Using with Build Tools

Integrate IndentScript into your build pipeline:

```bash
node indentscript.js -t src/app.isc dist/app.js
```

### Programmatic API

Use IndentScript in your Node.js applications:

```javascript
const { IndentScript } = require('./indentscript.js');

const transpiler = new IndentScript();

const code = `
def greet(name):
    print(f"Hello, {name}!")
`;

const jsCode = transpiler.transpile(code);
console.log(jsCode);

transpiler.execute(code);
```

---

## 🎨 Syntax Highlighting

### VS Code

Create a custom syntax highlighter or use Python syntax highlighting as a temporary solution:

1. Open any `.isc` file
2. Click on the language indicator in the bottom-right
3. Select "Python" for syntax highlighting

### Vim/Neovim

Add to your `.vimrc` or `init.vim`:

```vim
au BufNewFile,BufRead *.isc set filetype=python
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Reporting Bugs

Open an issue with:
- IndentScript version (`node indentscript.js -v`)
- Node.js version
- Operating system
- Sample code that reproduces the issue
- Expected vs actual behavior

### Suggesting Features

Open an issue with:
- Clear description of the feature
- Use cases and examples
- Why it would benefit IndentScript users

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📄 License

```
MIT License

Copyright (c) 2025 IndentScript

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- Inspired by Python's elegant syntax design
- Built on JavaScript's powerful ecosystem
- Community feedback and contributions

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ilovecode17/indentscript/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ilovecode17/indentscript/discussions)

---

## ⭐ Star History

If you find IndentScript useful, please consider giving it a star on GitHub!

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/ilovecode17/indentscript?style=social)
![GitHub forks](https://img.shields.io/github/forks/ilovecode17/indentscript?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/ilovecode17/indentscript?style=social)

---

<div align="center">

**Made with ❤️ in America 🇺🇸**

© 2025 IndentScript. All rights reserved.

</div>