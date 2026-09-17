//Long term project class
class Project {
    pID : number;                   //project ID
    pName : string;                 //project name
    deadline : number;              //project deadline
    total : number;                 //total time needs to complete project
    completed : number;             //time amount of completed tasks
    taskForPlace : task[] = [];     //temporary array for holding tasks that was created
    placeTask : task[] = [];        //array of elements arranged in order of execution
    taskIDCount : number;           //indicate task ID

    //create new Project
    constructor(pID:number, pName:string, deadline:number) {
        this.pID = pID;
        this.pName = pName;
        this.deadline = deadline;
        this.total = 0;             //total time needs is 0
        this.completed = 0;
        this.taskIDCount = 0;       //the first created task will get ID 0
    }

    //create task in project
    createTask(name:string, timeNeed:number, precedentID:number) : void{
       const t:task = new task(this.taskIDCount++, name, precedentID, timeNeed);    //task will get ID by taskIDCount, and increasing that variable 1  
       this.total += timeNeed;
       this.taskForPlace.push(t);  //push new task in temporary space
    }

    //arrange tasks in order of execution
    arrange() : void{
        for(let i = 0; i<this.taskForPlace.length; i++) {
            const t:task = this.taskForPlace[i];
            if(!t.isPlaced()) {     //check task is aleady placed
                this.placeTask.push(t);
                t.place();
            }
            if(t.getPrecedentID() > -1) {   //check precedent task
                if(!this.taskForPlace[t.getPrecedentID()].isPlaced()) {     //check precedent task is aleady placed
                    this.arrangePrecedent(this.placeTask.length -1, t.getPrecedentID());    //place precedent task at current index of task t, and shift t to right
                }
            }
        }
    }

    //arrange precedent task
    arrangePrecedent(pos:number, precedentID:number) : void{
        const t:task = this.taskForPlace[precedentID];
        this.placeTask.splice(pos,0,t); //place at pos, and shift all the task right of this pos to right
        t.place();
        if(t.getPrecedentID() > -1) {   //recurrently call
            if(!this.taskForPlace[t.getPrecedentID()].isPlaced()) this.arrangePrecedent(pos, t.getPrecedentID());
        }
    }

    //place item of placeTasks at Calendar
    place() : void {

    }

    //complete task
    complete() : void {
        const t:task | undefined = (this.placeTask.shift());
        
        if (t) {
        t.complete();
        this.completed += t.timeNeed;
        } else {
            console.warn("Complete: 실행할 태스크가 없습니다.");
        }
    }

    getProgress() : number{
        return this.completed/this.total;
    }

    setPName(pName:string) : void {
        this.pName = pName;
    }

    getPName() : string {
        return this.pName;
    }

    setDeadline(deadline:number) : void
    {
        this.deadline = deadline;
    }

    getDeadline() : number {
        return this.deadline;
    }
}

//specific task
class task {
    ID : number;            //task ID
    name: string;           //task name
    precedentID: number;    //precedent task ID
    timeNeed: number;       //time need to complete
    placeFlag: boolean;     //indicate whether task is placed or not
    completeFlag: boolean;  //indicate whether task is completed or not

    //create new task
    constructor(ID: number, name: string, precedentID: number, timeNeed: number) {
        this.ID = ID;
        this.name = name;
        this.timeNeed = timeNeed;
        this.precedentID = precedentID;
        this.placeFlag = false;
        this.completeFlag = false;
    }

    //set task status : PLACED
    place() : void {
        this.placeFlag = true;
    }
    
    //set task status : COMPLETED
    complete() : void {
        this.completeFlag = true;
    }

    getID() : number {
        return this.ID;
    }

    getName() : string {
        return this.name;
    }

    setName(name:string) : void
    {
        this.name = name;
    }

    getTimeNeed() : number {
        return this.timeNeed;
    }

    setTimeNeed(timeNeed:number) : void {
        this.timeNeed = timeNeed;
    }

    setPrecedentID(precedentID:number) : void {
        this.precedentID = precedentID;
    }

    getPrecedentID() : number {
        return this.precedentID;
    }

    setCompleteFlag(completeFlag:boolean) : void {
        this.completeFlag = completeFlag;
    }
 
    isPlaced() :boolean {
        return this.placeFlag;
    }

    isCompleted() : boolean {
        return this.completeFlag;
    }
}