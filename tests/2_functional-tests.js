/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');

const fetch = require('node-fetch');

var MongoClient = require('mongodb');
const CONNECTION_STRING = process.env.DB;

chai.use(chaiHttp);

suite('Functional Tests', function() {
    
    suite('GET /api/stock-prices => stockData object', function() {
      
      test('1 stock', function(done) {
        
       chai.request(server)
        .get('/api/stock-prices')
        .set('x-forwarded-for', '100.1.100.1,::ffff:10.10.10.181,::ffff:10.10.10.215') // https://stackoverflow.com/questions/36961197/add-custom-http-headers-to-chai-requests
        .query({stock: 'goog'})
        .end(function(err, res){
         
           if (err) {console.error(err)}
           else { 
             
             fetch('https://api.iextrading.com/1.0/stock/'+ 'goog' +'/quote')
              .then(apiRet => apiRet.json())
              .then(body => {
                 
                  // console.log('CHAI: ', res.body);
                  // console.log('FETCH: ',body);
               
                  assert.equal(res.status, 200);
                  assert.equal(res.body.stockData.stock,body.symbol);
                  assert.equal(res.body.stockData.name,body.companyName);
                  assert.equal(res.body.stockData.price,body.latestPrice);
                  done();
               
               })
             
            }
         
          }); 

        });
      
      test('1 stock with like', function(done) {
        
        chai.request(server)
        .get('/api/stock-prices')
        .set('x-forwarded-for','100.1.100.10,::ffff:10.10.10.181,::ffff:10.10.10.215')
        .query({stock: 'a', like: 'true'})
        .end(function(err,res){
          
          if (err) {console.error(err)}
          else {
            
            fetch('https://api.iextrading.com/1.0/stock/'+ 'a' +'/quote')
            .then(apiRet => apiRet.json())
            .then(body => {
              
              console.log('CHAI (B): ', res.body);
              console.log('FETCH: ',body);
              
              MongoClient.connect(CONNECTION_STRING, function(err,db){
                
                db.collection('stockLikes').find({stock: 'A'}).toArray(function(err,retArr){
                  
                  if (err) {console.error(err)}
                  else {
                    
                    console.log('mDB: ', retArr);
                    console.log(retArr[0].likedIPs);

                    assert.equal(res.status, 200);
                    assert.equal(res.body.stockData.stock, body.symbol);
                    assert.equal(res.body.stockData.name, body.companyName);
                    assert.equal(res.body.stockData.price, body.latestPrice);
                    assert.isAtLeast(retArr[0].likedIPs.length, 1); 
                    assert.notEqual(retArr[0].likedIPs.indexOf('100.1.100.10'),-1)
                    done();
                  
                  }
                  
                })
                
              })
              
            })
            
          }
          
        })
        
      });
      
      test('1 stock with like again (ensure likes arent double counted)', function(done) {
                
        chai.request(server)
        .get('/api/stock-prices')
        .set('x-forwarded-for','100.1.100.10,::ffff:10.10.10.181,::ffff:10.10.10.215')
        .query({stock: 'a', like: 'true'})
        .end(function(err,res){
          
          if (err) {console.error(err)}
          else {
            
            fetch('https://api.iextrading.com/1.0/stock/'+ 'a' +'/quote')
            .then(apiRet => apiRet.json())
            .then(body => {
              
              // console.log('CHAI: ', res.body);
              // console.log('FETCH: ',body);
              
              MongoClient.connect(CONNECTION_STRING, function(err,db){
                
                db.collection('stockLikes').find({stock: 'A'}).toArray(function(err,retArr){
                  
                  if (err) {console.error(err)}
                  else {
                    
                    // console.log('mDB: ', retArr);
                    // console.log(retArr[0].likedIPs);

                    assert.equal(res.status, 200);
                    assert.equal(res.body.stockData.stock, body.symbol);
                    assert.equal(res.body.stockData.name, body.companyName);
                    assert.equal(res.body.stockData.price, body.latestPrice);
                    assert.isAtLeast(retArr[0].likedIPs.length, 1);
                    assert.notEqual(retArr[0].likedIPs.indexOf('100.1.100.10'),-1)
                    done();
                   
                  }
                })
                
              })
              
            })
            
          }
          
        })

      });
      
      test('2 stocks', function(done) {
                
        chai.request(server)
        .get('/api/stock-prices')
        .set('x-forwarded-for','100.1.100.1,::ffff:10.10.10.181,::ffff:10.10.10.215')
        .query( { stock: [ 'i', 'k' ] } )
        .end( function(err,res) {
          
          if (err) {console.error(err)}
          else {
            
            fetch('https://api.iextrading.com/1.0/stock/'+ 'i' +'/quote')
            .then(apiRetI => apiRetI.json())
            .then(bodyI => {
              
              console.log('CHAI: ', res.body);
              console.log('FETCH I: ', bodyI);
              
              fetch('https://api.iextrading.com/1.0/stock/'+ 'k' +'/quote')
                .then(apiRetK => apiRetK.json())
                .then(bodyK => {
              
                console.log('FETCH K: ',bodyK); 

                
                MongoClient.connect(CONNECTION_STRING, function(err,db){
                  
                  db.collection('stockLikes').find({stock: 'I'}).toArray(function(err,retArrI){
                  
                  if (err) {console.error(err)}
                  else {
                    
                    console.log('mDB (ticker I): ', retArrI);
                    
                    db.collection('stockLikes').find({stock: 'K'}).toArray(function(err,retArrK){
                  
                      if (err) {console.error(err)}
                      else {

                        console.log('mDB (ticker K): ', retArrK);

                        assert.equal(res.status, 200);
                        
                        // console.log(res.body.stockData[0], res.body.stockData[1])
                        
                        assert.equal(res.body.stockData[0].stock, bodyI.symbol);
                        assert.equal(res.body.stockData[0].name, bodyI.companyName);
                        assert.equal(res.body.stockData[0].price, bodyI.latestPrice);
                        assert.equal(res.body.stockData[0].rel_likes, retArrI.length - retArrK.length );
                        
                        assert.equal(res.body.stockData[1].stock, bodyK.symbol);
                        assert.equal(res.body.stockData[1].name, bodyK.companyName);
                        assert.equal(res.body.stockData[1].price, bodyK.latestPrice);
                        assert.equal(res.body.stockData[1].rel_likes, retArrK.length - retArrI.length );
                        
                        done();

                      }
                      
                    })
                  
                  }
                    
                })
                
                })
              
              })
              
            })
            
          }
          
        })
        
      });
      
      test('2 stocks with like', function(done) {
        
        chai.request(server)
        .get('/api/stock-prices')
        .set('x-forwarded-for','100.1.100.1,::ffff:10.10.10.181,::ffff:10.10.10.215')
        .query( { stock: [ 'i', 'k' ], like: 'true'} )
        .end( function(err,res) {
          
          if (err) {console.error(err)}
          else {
            
            fetch('https://api.iextrading.com/1.0/stock/'+ 'i' +'/quote')
            .then(apiRetI => apiRetI.json())
            .then(bodyI => {
              
              console.log('CHAI: ', res.body);
              // console.log('FETCH I: ', bodyI);
              
              fetch('https://api.iextrading.com/1.0/stock/'+ 'k' +'/quote')
                .then(apiRetK => apiRetK.json())
                .then(bodyK => {
              
                // console.log('FETCH K: ',bodyK); 
                
                MongoClient.connect(CONNECTION_STRING, function(err,db){
                  
                  db.collection('stockLikes').find({stock: 'I'}).toArray(function(err,retArrI){
                  
                  if (err) {console.error(err)}
                  else {
                    
                    // console.log('mDB (ticker I): ', retArrI);
                    
                    db.collection('stockLikes').find({stock: 'K'}).toArray(function(err,retArrK){
                  
                      if (err) {console.error(err)}
                      else {

                        // console.log('mDB (ticker K): ', retArrK);
                        
                        assert.equal(res.body.stockData[0].stock, bodyI.symbol);
                        assert.equal(res.body.stockData[0].name, bodyI.companyName);
                        assert.equal(res.body.stockData[0].price, bodyI.latestPrice);
                        assert.equal(res.body.stockData[0].rel_likes, retArrI.length - retArrK.length );
                        assert.isAtLeast(retArrI[0].likedIPs.length, 1);
                        
                        assert.equal(res.body.stockData[1].stock, bodyK.symbol);
                        assert.equal(res.body.stockData[1].name, bodyK.companyName);
                        assert.equal(res.body.stockData[1].price, bodyK.latestPrice);
                        assert.equal(res.body.stockData[1].rel_likes, retArrK.length - retArrI.length );
                        assert.isAtLeast(retArrK[0].likedIPs.length, 1);
                        
                        done();

                        // assert.equal(res.status, 200);
                        // assert.equal(res.body[0].I, bodyI.latestPrice);
                        // assert.equal(res.body[1].K, bodyK.latestPrice);
                        
                        // assert.equal(res.body[2].rel_likes, retArrI.length - retArrK.length );
                        
                        // assert.isAtLeast(retArrI[0].likedIPs.length, 1);
                        // assert.isAtLeast(retArrK[0].likedIPs.length, 1);
                        
                        // assert.notEqual(retArrI[0].likedIPs.indexOf('100.1.100.1'),-1);
                        // assert.notEqual(retArrK[0].likedIPs.indexOf('100.1.100.1'),-1);
                        // done(); 

                      }  
                      
                    })
                  
                  }
                    
                })
                
                })
              
              })
              
            })
            
          }
          
        })

      });
      
    });

});
