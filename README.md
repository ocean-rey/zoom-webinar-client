# zoom-webinar-client

This module was created because dealing with the official zoom api is not fun. 
If you don't believe me, read the zoom [api documentation](https://marketplace.zoom.us/docs/api-reference/zoom-api/).

This module is not intended as a full api replacement, it is only designed to handle some common tasks relating to webinars.

This module can: 
 - Create single occurance webinars
 - Create recurring webinars (daily, weekly, monthly)
 - Register users to webinars
 - Get attendance for webinars

---

## Usage

### Initialization

Quick note: Before using this client, you must have a zoom account with a webinar lisence.

First, get your [zoom api + secret keys](https://devforum.zoom.us/t/finding-your-api-key-secret-credentials-in-marketplace/3471)

Don't worry about generating a JWT, that part is handled by the module. Your api + secret key is sufficent.

    const zoomClient = new ZoomClient({
        apiKey: ZOOM_API_KEY,
        secretKey: ZOOM_SECRET_KEY,
        timezone: `Asia/Riyadh`, 
        user: `your@email.com`,
    });`
    
 Some notes about the paramters:
  
  - **timezone**:
    - You can leave this empty and it will default to `Asia/Riyadh`. Presumably you don't want this, find your timezone code [here](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) 
  - **user**:
    - This parameter is required. You should put the email address that the api/secret key combo belongs to. Alternatively, if your account manages differenet users, you can enter the email address that belongs to one of those users. (assuming that sub user also has a webinar lisence).
    - This can also be overridden when calling a createWebinar function to create the webinar under a different user than the one defined in the constructor. however, the overriding user must still be managed by the user in the constructor.

---
    
### Creating a webinar

Creating a webinar can be done in a number of diffierent ways. Monthly, weekly, daily as well as single occurance webinars can be created in this client.

All create webinar functions return the **webinar id**. This id can later be used to get attendance as well as register users.

#### Single Occurance

##### **Required** parameters:

 - `name`
    The name of the webinar
 - `start`
    Date object denoting the starting time.
 - `end`
    Date object denoting the end time

#### **Optional** parameters
 - `agenda`
      String webinar description
  - `account`
      To override the account in the clients constructor, inclide the managed users email here. (note that the managed user must also have a webinar lisence.)
  - `password`
      Use this field so that the webinar is created with a password
  - `approval`
      - `"none"`
            Default. Do not require registration or apporval
      - `"registration"`
            Users must be registered to the webinar before being able to join.    
      -  `"registration+approval"`
            After a user registers, they must then be approved by the webinar owner to join the webinar. Registration approval is not currenlty supported by this client.
  - `recording`
    -  `"local"`
          Webinar recording will be saved on the device which runs the webinar.
    - `"cloud"`
          Webinar recording will be saved on zoom cloud storage (requires subscription)
    - `"none"`
          Webinar will not be recorded.
 
#### Minimal Example

```
  const startTime = new Date();
  startTime.setUTCHours(15);
  startTime.setUTCMinutes(30);
  const endTime = startTime;
  endTime.setUTCHours(16);
  const webinarID = await zoomClient.createSingleWebinar({
    name: "test single webinar",
    start: startTime,
    end: endTime, 
  });
```

---

## Recurring Webinar

Although there are many different ways to create a recurring webinar, some core ideas remain, and some parameters are required across different types of recurring webinars.

### *Always* required parameters:

- `start`
   Date object. In most cases, for recurring webinars, we only care about the time portion of this Date object. (Only daily recurrence cares about the date portion.)
- `endAfter`
   Note that here we use `endAfter` instead of `end`. This is because recurring webinars in one of two ways: Stop recurring after a certain date, or stop reuccuring after a certain number of recurrences. For this reason `endAfter` can be either a `Date` **or** a `number`.
- `name`
   Name of the webinar.
- `duration`
   Length of the webinar in minutes.
- `interval`
   Have the occurances spaced out every x days, weeks, or months (depending on `type`). ie. `interval: 1, type: daily` will cause the webinar to reapeat daily. setting interval to `2` will cause the webinar to repeat every other day.
- `type`
   What kind of recurrence do we want this webinar to have? Can be either `"daily"`, `"weekly"`, or `"monthly"`.

### Optional parameters:

>see Single occurance optional parameters

### Daily Reccurence:

Daily recurrence is fairly straightforward. No specific parameters are required.

#### Minimal example: 

```
  const dailyRecurringWebinarID = await zoomClient.createRecurringWebinar({
    name: "Daily recurring webinar",
    start: startTime,
    endAfter: 5,
    interval: 2,
    type: "daily",
  });
```

### Weekly Recurrence

There are only 2 main differences between weekly reccurence and daily reccurence.

- `interval` behavior change. Now refers to weeks. ie: `interval: 3` means that the webinar will reoccur every 3 weeks.
- inclustion of *new* `weekdays` parameter. Accepts an array of days of the week. ie: `interval: 2, weekdays: ["friday"]` will create a webinar which occurs every other friday until `endAfter` is reached.

#### Minimal example:

```
  const weeklyRecurringWebinarID = await zoomClient.createRecurringWebinar({
    name: "Every sunday and monday weekly every other week",
    start: startTime,
    endAfter: 10,
    interval: 2,
    weekdays: ["sunday", "monday"],
    type: "weekly",
  });
```


### Monthly Recurrence

Monthly recurrence is by far the most complicated type of recurrence to deal with in the zoom api, one of the aims for this module is to simplify this.

Monthly recurrence differs from other types of recurrence in that there are multiple ways to set monthly recurrence.

Either in a staightforward manner, day of the month using the `monthlyDay` paramter (a value between 1 and 31)

*or* by the week using `monthlyWeek` and `weekdays` (borrowing from the implementation of weekly recurrance.)

Both parametrs are required if not using `monthlyDay`:

- `montlyWeek` should be one of (-1, 1, 2 3 ,4). -1 being the last week in the month, 1 being the first, and so on.
- `weekdays` should once again be an array of days of the week. At least one day is requried.

eg: `monthtlyWeek: 3, weekdays: ["thursday"], interval: 1` to create a webinar which occurs every month on thursday during the 3rd week of a month. Yes this is extremely obtuse. Zoom api supports it though so here you go.

#### Minimal example(s)

Create a webinar which runs every month on the 15th of the month (for 3 months.)
```
  const monthlyRecurringWebinarID = await zoomClient.createRecurringWebinar({
    name: "Every month on the 15th",
    start: startTime,
    endAfter: 3,
    interval: 1,
    monthlyDay: 15,
    type: "monthly",
  });
```

Create a webinar which runs every thursday of the last week of each month, every 3 months, 3 times.
```
  const monthlyRecurringWebinarID = await zoomClient.createRecurringWebinar({
    name: "Last thursday every 3 months",
    start: startTime,
    endAfter: 3,
    interval: 3,
    monthlyWeek: -1,
    weekdays: ["thursday"],
    type: "monthly",
  });
```
---

## Registration

A webinar isn't of much use when no one is regiseterd for it. (especially when setting approval: "registration" | "registration+approval").
In order to register a user to a webinar and get their unique join url, simply call the `registerToWebinar` function.

### Parameters

- `firstName`
- `lastName`
- `email`
- `webinarID`

### Example

This example includes the earlier example for creating a webinar, to show  the use of the returned webinar ID.

```
// create a webinar and get the ID
const webinarID = await zoomClient.createSingleWebinar({
    name: "test single webinar",
    start: startTime,
    end: endTime,
    approval: "registration"
  });
  
  const firstName = "John";
  const lastName = "Doe";
  const email = "johndoe@email.com";
  const joinURL = await zoomClient.registerToWebinar({
    webinarID,
    firstName,
    lastName,
    email,
  });
  console.log(joinURL);
  // https://us02web.zoom.us/w/webinarID?tk=some_hash&uuid=some_value
```

---

## Attendnace / Participation report.

Easily the simplest function of this client.

Accepts a **webinar id** as a parameter and returns an array of participation objects in the following format: 
```
[{id: string, user_id: string, name: string, user_email: string, join_time: ISO Date string, leave_time: ISO Date string, duration: integer, attentiveness_score: string, failover: boolean, customer_key: string}, ...]
```

for details on what each property means, check out the [zoom api documentation](https://marketplace.zoom.us/docs/api-reference/zoom-api/methods/#operation/reportWebinarParticipants)

> Note that for recurring webinars, a participation report is appended to the returned list for every instance of the webinar. So an array of particpants returned this way will have multiple objects belonging to the same user for each webinar. Keep this in mind.

### Example

```
  const participants = await zoomClient.getWebinarAttendees("89978586908")
  console.log(participants)
  /*[
      {
        id: 'asdhasudhsuahdjsa',
        user_id: '712489731049',
        name: 'Webinar Host',
        user_email: 'your@email.com',
        join_time: '2022-02-23T13:01:28Z',
        leave_time: '2022-02-23T13:04:22Z',
        duration: 174,
        attentiveness_score: '',
        failover: false,customer_key: ''
      },
      {
        id: 'hfdalksufhakudshfjsd',
        user_id: '74320842337854',
        name: 'John Doe',
        user_email: 'johndoe@email.com',
        join_time: '2022-02-23T13:03:29Z',
        leave_time: '2022-02-23T13:03:42Z',
        duration: 13,
        attentiveness_score: '',
        failover: false,
        customer_key: ''
    }
  ]*/
```

> Also note that the webinar hosts / co-hosts will be included in this report.
