import requests
res = requests.put('http://localhost:8080/keyValue-store/subject', data = {'val': 'Distributed System'})
