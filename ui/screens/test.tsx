import { Search,Suggest  } from 'react-native-yamap';
import { GeoFigureType } from 'react-native-yamap/build/Search';
import { Geocoder } from 'react-native-yamap';
import { Alert } from 'react-native';
import {sortByDistance,Point} from './SortResult'
import { OverpassElement } from './OverpassElement';
Geocoder.init('500f7015-58c8-477a-aa0c-556ea02c2d9e');
export interface Coordinates {
  lat: number;
  lon: number;
}
export class ClassTimer {
    private timerId: string | number | NodeJS.Timeout | null | undefined;
    private readonly duration: number;
    
    id: number = 1;
    constructor() {
      this.duration =10;
    }
    //  start  ():void{
    //   console.log("start ");
    //   if (this.timerId === null) {
    //     this.fetchData();
    //      this.timerId=  setInterval(this.fetchData,10000)
    //     console.log(this.timerId);
    //   }
    // }
    async findPlace(){
      const userTestStatus: { lat: number, lon: number }[] = [
      {lat: 59.9537667, lon: 30.4121783},
       {lat: 59.9537667, lon: 35.4121783},
       {lat: 58.9537667, lon: 35.4121783},
       {lat: 50.9537667, lon: 35.4121783},
       {lat: 75.9537667, lon: 35.4121783},
       {lat: 59.9537667, lon: 37.4121783}
      ];
      const randIndex = Math.floor(Math.random() * userTestStatus.length);
      console.log(randIndex);
      try {
        console.log("check");

        
        const result= await Geocoder.geoToAddress(userTestStatus[randIndex]);
        console.log(result);
      // const response = await fetch('http://localhost:5555/ask', {  //ЗДЕСЬ МОЖНО ПОМЕНЯТЬ IP СЕРВЕРА
      //         method: 'POST',
      //         headers: {
      //           'Content-Type': 'application/json',
      //         },
              
      //         body: JSON.stringify({
      //           result,
      //         }),
      //       });
      //       if (!response.ok) {
      //         throw new Error(`HTTP Error: ${response.status}`);
      //       }
      //       const data = await response.json();
      //       // setResponseText(data);
      //       console.log('Ответ от сервера:', data);
      //       if (data.message) {
      //        console.log(data.message);
      //       } else {
      //         throw new Error('Ответ не содержит поля "message"');
      //       }
          } catch (error: any) {
            console.log("class");
            console.error('Ошибка при запросе:', error);
            // Alert.alert('Ошибка', 'Не удалось получить рассказ');
          }
          this.id=(this.id+1);
    }
    
    fetchData = async (coords: Coordinates, radius: number = 100) => {
      console.log("run");
      try {
        const { lat, lon } = coords;
        
        const query = `
          [out:json][timeout:25];
          (
            way(around:${radius}, ${lat}, ${lon})["highway"~"primary|secondary|tertiary|residential"];
            node(around:${radius}, ${lat}, ${lon})["building"];
            way(around:${radius}, ${lat}, ${lon})["building"];
            nwr(around:${radius}, ${lat}, ${lon})["amenity"~"arts_centre|fountain|planetarium|theatre|monastery"];
            nwr(around:${radius}, ${lat}, ${lon})["tourism"~"aquarium|artwork|attraction|gallery|museum|theme_park|viewpoint|zoo|yes"];
            nwr(around:${radius}, ${lat}, ${lon})["historic"];
            node(around:${radius}, ${lat}, ${lon})["leisure"="park"];
            way(around:${radius}, ${lat}, ${lon})["leisure"="park"];
          );
          out body;
          >;
          out skel qt;
        `;
        
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `data=${encodeURIComponent(query)}`,
        });

        const result = await response.json();
        const elementsMap = new Map<number, OverpassElement>();
        result.elements.forEach((element: OverpassElement) => elementsMap.set(element.id, element));
        const centerPoint: Point = { lat: 59.9537667, lon: 30.4121783 };
        const sortedResults = sortByDistance(result.elements, centerPoint, elementsMap);
        console.log("места надейны");
        return sortedResults;
      } catch (error) {
        console.error('Ошибка при выполнении запроса:', error);
      } finally {
        
      }
    };
    // получения названия города
    
    detectCity=async (coords: Coordinates)=> {
      try{
      const { lat, lon } = coords;
      const query = `
        [out:json];
        is_in(${lat},${lon})->.a;
        area.a[admin_level="6"][boundary=administrative][name];
        out center;
      `;
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      });
      const result = await response.json();
      return await result.elements.tags["addr:region"];}
      catch (error) {
        console.error('Ошибка при выполнении запроса:', error);
      }
    };
    stop(): void {
      console.log(this.timerId);
      if (this.timerId !== null) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
    }
  }
