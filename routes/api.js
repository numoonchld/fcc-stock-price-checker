/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb');

const fetch = require('node-fetch');
// var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(function (req, res){
      
      // log query to console:       
      {   
      // console.log(Array.isArray(req.query.stock), req.query.stock.length,req.query.like)
      console.log('--- 00:',req.query);
      }
      
      // find client IP:
      // console.log(req.get('x-forwarded-for').split(',')[0]);
      let clientIP = req.get('x-forwarded-for').split(',')[0];
      
      
      // 2. I can GET /api/stock-prices with form data containing a Nasdaq stock ticker and recieve back an object stockData.
      if (!Array.isArray(req.query.stock)) {
        
        var stockData = {};
        
        {
        // Stock price API endpoint: https://iextrading.com/developer/docs/#price

        // https://www.npmjs.com/package/xmlhttprequest
        // https://learn.freecodecamp.org/data-visualization/json-apis-and-ajax/get-json-with-the-javascript-xmlhttprequest-method       
        // var getStockAPI = new XMLHttpRequest();
        // getStockAPI.open("GET",'https://api.iextrading.com/1.0/stock/GOOG/price', true) // true is to set async 
        // getStockAPI.send();
        // getStockAPI.onload = function(){
        //   console.log(getStockAPI.responseText);
        // };

        // https://www.npmjs.com/package/node-fetch
        // fetch('https://api.iextrading.com/1.0/stock/GOOG/price'
        }

        // 3. In stockData, I can see the stock(string, the ticker), price(decimal in string format), and likes(int).
        
        // Like is not checked:
        if (!req.query.like) {

          console.log('path I.a');

          fetch('https://api.iextrading.com/1.0/stock/'+ req.query.stock +'/quote')
            .then(res => 
              res.json()
            )
            .then(body => {
              // console.log(body);
              console.log(body.symbol, body.companyName, body.latestPrice);
              stockData.stock = body.symbol;
              stockData.name = body.companyName;
              stockData.price = body.latestPrice.toString();


              MongoClient.connect(CONNECTION_STRING,function(err,db){

                if (err) {console.error(err)}
                else {
                  console.info('connected to db');

                  // check if ticker is in collection: 
                  db.collection('stockLikes').find({stock: stockData.stock}).toArray(function(err,retDocs){


                    //if ticker not found in collection: (no writing or reading likes)
                    if (retDocs.length == 0) {
                      console.log("ticker doesn't exist in collection");

                      // since ticker not liked before, IP not logged before; not liked now also;
                      // simple return likes as 0
                      stockData.likes = 0;

                      console.log('--:', stockData);
                      res.json({stockData: stockData});

                    }

                    //if ticker exists in collection: (reading likes)
                    else if (retDocs.length == 1) {
                      console.log("ticker found in collection");

                      // this means ticker has been liked atleast once before, 
                      // return current length of IP array as number of likes 
                      db.collection('stockLikes').find({stock: stockData.stock}).toArray(function(err,retDocs){

                        console.log(retDocs[0]);
                        stockData.likes = retDocs[0].likedIPs.length;

                        console.log('--:', stockData);
                        res.json({stockData: stockData});

                      })



                    }

                  })

                }


              })

              // console.log('--:', stockData);
              // res.json(stockData);

            })
            .catch(function(){
              console.log("fetch dint return anything");
              res.json({message: 'ticker not found on nasdaq api'})
            }); 



        }

        // 4. I can also pass along field like as true(boolean) to have my like added to the stock(s). Only 1 like per ip should be accepted.
        
        // Like is checked:
        else if (req.query.like === 'true') {

          console.log('path I.b');
          console.info({message: 'under construction'}, req.query.like );

          fetch('https://api.iextrading.com/1.0/stock/'+ req.query.stock +'/quote')
            .then(res => res.json() )
            .then(body => {
              // console.log(body);
              // console.log(body.symbol, body.companyName, body.latestPrice);
              stockData.stock = body.symbol;
              stockData.name = body.companyName;
              stockData.price = body.latestPrice;


              MongoClient.connect(CONNECTION_STRING,function(err,db){

                if (err) {console.error(err)}
                else {
                  console.info('connected to db');

                  // check if ticker created in db: 
                  db.collection('stockLikes').find({stock: stockData.stock}).toArray(function(err,retDocs){

                    //if ticker not found in collection:
                    if (retDocs.length == 0) {
                      console.log("ticker doesn't exist in collection");

                      // add ticker to collection, add IP address to IP address array and log current like:
                      db.collection('stockLikes')
                        .insertOne(
                                    {
                                      stock: stockData.stock,
                                      likedIPs: [clientIP]  
                                    }
                                  )
                      console.log("added ticker " + stockData.ticker + " to track likes");
                      // set number of likes to 1 in the stockData object:                     
                      stockData.likes = 1;

                      console.log('--:', stockData);
                      res.json({stockData:stockData});

                    }

                    //if ticker exists in collection: (reading likes)
                    else if (retDocs.length == 1) {
                      console.log("ticker found in collection");

                      // this means ticker has been liked atleast once before, 
                      // check if current ip exists in the likedIPs array
                      console.log(retDocs[0]);

                      // if current IP doesn't exist in likedIPs, add it to the IP array and return length:                     
                      if (retDocs[0].likedIPs.indexOf(clientIP) === -1) {
                        console.log('Current IP hasnt liked '+ stockData.stock +' before');

                        // Add IP to likedIPs: https://docs.mongodb.com/manual/reference/operator/update/push/#append-a-value-to-an-array
                        db.collection('stockLikes')
                          .update(
                                    { stock: stockData.stock },
                                    { $push: {likedIPs: clientIP} }
                                 )

                      } 
                      // if current IP has already liked the stock, simply return the length of the likedIPs array:
                      else if (retDocs[0].likedIPs.indexOf(clientIP) !== -1) {

                        // return current length of IP array as number of likes
                        stockData.likes = retDocs[0].likedIPs.length;

                      }

                      console.log('--:', stockData);
                      res.json({stockData: stockData});

                    }

                  })

                }


              })

  //             console.log('--:', stockData);
  //             res.json(stockData);

            })
            .catch(function(){
                console.log("fetch dint return anything");
                res.json({message: 'ticker not found on nasdaq api'})
              });  
        }
        
      }
      // 5. If I pass along 2 stocks, the return object will be an array with both stock's info but instead of likes, it will display rel_likes(the difference between the likes on both) on both.
      else if (Array.isArray(req.query.stock) && req.query.stock.length === 2) {
        
        var stockData = [];
        
        // 
        {
        console.log('path II');
        // res.json({message: 'under construction'});
        }

        // store the 2 stock queries:
        {
          var stockLeft = {
            query: req.query.stock[0]
          }; 

          var stockRight = {
            query: req.query.stock[1]
          };
        }

        // get stock price for left stock:
        fetch('https://api.iextrading.com/1.0/stock/'+ stockLeft.query +'/quote')
          .then(resL => 
            resL.json()
          )
          .then(bodyL => {

              // console.log(bodyL);
              console.log(bodyL.symbol, bodyL.companyName, bodyL.latestPrice);
              stockLeft.stock = bodyL.symbol;
              stockLeft.name = bodyL.companyName;
              stockLeft.price = bodyL.latestPrice.toString();


              // get stock price for right stock:
              fetch('https://api.iextrading.com/1.0/stock/'+ stockRight.query +'/quote')
                .then(resR => 
                  resR.json()
                )
                .then(bodyR => {

                  // console.log(bodyR);
                  console.log(bodyR.symbol, bodyR.companyName, bodyR.latestPrice);
                  stockRight.stock = bodyR.symbol;
                  stockRight.name = bodyR.companyName;
                  stockRight.price = bodyR.latestPrice.toString();

                  // console.log("---", stockLeft);
                  // console.log("---", stockRight);

                  // connect to db collection to count and compare likes:
                  
                  MongoClient.connect(CONNECTION_STRING, function(err,db){

                    if (err) {console.error(err)}
                    else {
                      
                      console.log('connection to db established'); 

                      // find left stock likes:
                      db.collection('stockLikes').find({stock: stockLeft.stock}).toArray(function(err,retDocsL){
                        
                        console.log(retDocsL);  
                        
                        if (retDocsL.length === 0) {
                          stockLeft.likes = 0;

                          // if like both checked, then add clientIP to likedIPs array:
                          // add ticker to collection, add IP address to IP address array and log current like:
                          if (req.query.like === 'true') {
                            db.collection('stockLikes')
                              .insertOne(
                                {
                                  stock: stockLeft.stock,
                                  likedIPs: [clientIP]  
                                }
                              );
                            stockLeft.likes += 1;
                            
                          }

                        }
                        else if (retDocsL.length === 1) {
                          stockLeft.likes = retDocsL[0].likedIPs.length;

                          // if like both checked, then append clientIP to likedIPs array if it doesnt exit already:
                          if (req.query.like === 'true') {
                            
                            if (retDocsL[0].likedIPs.indexOf(clientIP) === -1) {
                            
                              db.collection('stockLikes')
                                .update(
                                        { stock: stockLeft.stock },
                                        { $push: {likedIPs: clientIP } }
                                       );
                              
                              stockLeft.likes += 1;
                              
                            }
                          }
                        }

                        // find right stock likes:
                        db.collection('stockLikes').find({stock: stockRight.stock}).toArray(function(err,retDocsR){
                          console.log(retDocsR);                          
                          if (retDocsR.length === 0) {
                            stockRight.likes = 0;

                            // if like both checked, then add clientIP to likedIPs array:
                            if (req.query.like === 'true') {
                              db.collection('stockLikes')
                                .insertOne(
                                  {
                                    stock: stockRight.stock,
                                    likedIPs: [clientIP]  
                                  }
                                );
                              stockRight.likes += 1;
                            }

                          }
                          else if (retDocsR.length === 1) {
                            stockRight.likes = retDocsR[0].likedIPs.length;

                            // if like both checked, then append clientIP to likedIPs array if it doesnt exit already:
                            if (req.query.like === 'true') {
                              
                              if (retDocsR[0].likedIPs.indexOf(clientIP) === -1) {
                                
                                db.collection('stockLikes')
                                  .update(
                                          { stock: stockRight.stock },
                                          { $push: {likedIPs: clientIP } }
                                         );
                                
                                stockRight.likes += 1;
                                
                              }
                            }
                          } 

                          console.log("---", stockLeft);
                          console.log("---", stockRight);

                          // console.log([{[stockLeft.ticker]:stockLeft.price }, {[stockRight.ticker]:stockRight.price }, {'rel_likes': stockLeft.likes - stockRight.likes} ])
                          res.json({stockData: [{stock:stockLeft.stock, name:stockLeft.name, price:stockLeft.price, 'rel_likes': stockLeft.likes - stockRight.likes}, {stock:stockRight.stock, name:stockRight.name, price:stockRight.price,'rel_likes': stockRight.likes - stockLeft.likes } ]});

                        })                     

                      });

                      }

                  })

                })
                .catch(function(){
                  console.log("right ticker fetch dint return anything");
                  res.json({message: 'right input ticker not found on nasdaq api'})
                }); 

            }
          )
          .catch(function(){
              console.log("left ticker fetch dint return anything");
              res.json({message: 'left input ticker not found on nasdaq api'})
            }); 
        
      }
      
    });
    
};
