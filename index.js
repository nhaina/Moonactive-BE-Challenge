const fs = require('fs');
const express = require('express')
const app = express()
const port = +process.argv[2] || 3000
const client = require('redis').createClient()
client.on('error', (err) => console.log('Redis Client Error', err));

client.on('ready', () => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Example app listening at http://0.0.0.0:${port}`)
    })
})

const cardsData = fs.readFileSync('./cards.json');
const cards = JSON.parse(cardsData);
const multi = client.multi();
cards.forEach(function(card, idx) {
		multi.HSET('cards', card.id, JSON.stringify(card));
		multi.SADD('cardsIds', card.id);
});
multi.exec()


async function getMissingCardId(key) {
	  var missingCardsIds = await client.SDIFF(['cardsIds', key]);
		return missingCardsIds.pop();
}

app.get('/card_add', async (req, res) => {
    const  key = 'user_id:' + req.query.id
    let missingCardId = await getMissingCardId(key);
		if(missingCardId === undefined){
            res.send({id: "ALL CARDS"})
            return
		} else  {
			await client.SADD(key, missingCardId, 'NX')
			res.send(await client.HGET('cards', missingCardId))
    }
})

app.get('/ready', async (req, res) => {
    res.send({ready: true})
})

client.connect();
