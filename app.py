from flask import Flask, send_from_directory

app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/main')
@app.route('/editor.html')
def editor():
    return send_from_directory('.', 'editor.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
